import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { createPrismaMock } from '../../common/testing/prisma-mock.helper';

describe('TenantsService', () => {
  let service: TenantsService;
  let prisma: ReturnType<typeof createPrismaMock>;

  const tenantId = 'tenant-1';
  const mockTenant = {
    id: tenantId,
    name: 'Test Workspace',
    slug: 'test-ws',
    ownerId: 'user-1',
    plan: { id: 'plan-1', name: 'Free', slug: 'free' },
    _count: { bots: 2, members: 3, knowledgeBases: 1 },
  };

  beforeEach(async () => {
    prisma = createPrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<TenantsService>(TenantsService);
  });

  describe('getTenant', () => {
    it('should return tenant with plan and counts', async () => {
      prisma.tenant.findUnique.mockResolvedValue(mockTenant);

      const result = await service.getTenant(tenantId);

      expect(result.name).toBe('Test Workspace');
      expect(result._count.bots).toBe(2);
    });

    it('should throw NotFoundException if not found', async () => {
      prisma.tenant.findUnique.mockResolvedValue(null);

      await expect(service.getTenant('bad-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateTenant', () => {
    it('should update tenant when role is owner', async () => {
      prisma.tenant.update.mockResolvedValue({ ...mockTenant, name: 'Updated' });

      const result = await service.updateTenant(tenantId, 'owner', { name: 'Updated' });

      expect(result.name).toBe('Updated');
    });

    it('should update tenant when role is admin', async () => {
      prisma.tenant.update.mockResolvedValue(mockTenant);

      await expect(
        service.updateTenant(tenantId, 'admin', { name: 'New' }),
      ).resolves.toBeDefined();
    });

    it('should throw ForbiddenException for member role', async () => {
      await expect(
        service.updateTenant(tenantId, 'member', { name: 'New' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('listMembers', () => {
    it('should return all members with user details', async () => {
      const members = [
        { userId: 'u1', role: 'owner', user: { id: 'u1', email: 'a@b.com' } },
        { userId: 'u2', role: 'member', user: { id: 'u2', email: 'c@d.com' } },
      ];
      prisma.tenantMember.findMany.mockResolvedValue(members);

      const result = await service.listMembers(tenantId);

      expect(result).toHaveLength(2);
    });
  });

  describe('inviteMember', () => {
    it('should create a new user and membership when user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      const newUser = { id: 'new-user', email: 'invite@test.com' };
      prisma.user.create.mockResolvedValue(newUser);
      prisma.tenantMember.findUnique.mockResolvedValue(null);
      prisma.tenantMember.create.mockResolvedValue({
        userId: 'new-user',
        role: 'member',
        status: 'invited',
        user: newUser,
      });

      const result = await service.inviteMember(tenantId, 'owner', {
        email: 'invite@test.com',
      });

      expect(result.status).toBe('invited');
      expect(prisma.user.create).toHaveBeenCalled();
    });

    it('should reuse existing user when inviting', async () => {
      const existingUser = { id: 'existing-user', email: 'exists@test.com' };
      prisma.user.findUnique.mockResolvedValue(existingUser);
      prisma.tenantMember.findUnique.mockResolvedValue(null);
      prisma.tenantMember.create.mockResolvedValue({
        userId: 'existing-user',
        role: 'member',
        status: 'invited',
        user: existingUser,
      });

      await service.inviteMember(tenantId, 'admin', { email: 'exists@test.com' });

      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException if already a member', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1' });
      prisma.tenantMember.findUnique.mockResolvedValue({ userId: 'u1', role: 'member' });

      await expect(
        service.inviteMember(tenantId, 'owner', { email: 'dup@test.com' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException for member role', async () => {
      await expect(
        service.inviteMember(tenantId, 'member', { email: 'x@test.com' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('updateMemberRole', () => {
    it('should update member role when requester is owner', async () => {
      prisma.tenantMember.findUnique.mockResolvedValue({
        userId: 'u2',
        role: 'member',
      });
      prisma.tenantMember.update.mockResolvedValue({
        userId: 'u2',
        role: 'admin',
        user: { id: 'u2' },
      });

      const result = await service.updateMemberRole(tenantId, 'u2', 'owner', {
        role: 'admin',
      });

      expect(result.role).toBe('admin');
    });

    it('should throw ForbiddenException if requester is not owner', async () => {
      await expect(
        service.updateMemberRole(tenantId, 'u2', 'admin', { role: 'admin' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when trying to change owner role', async () => {
      prisma.tenantMember.findUnique.mockResolvedValue({
        userId: 'u1',
        role: 'owner',
      });

      await expect(
        service.updateMemberRole(tenantId, 'u1', 'owner', { role: 'admin' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if member not found', async () => {
      prisma.tenantMember.findUnique.mockResolvedValue(null);

      await expect(
        service.updateMemberRole(tenantId, 'bad-id', 'owner', { role: 'admin' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeMember', () => {
    it('should remove a member', async () => {
      prisma.tenantMember.findUnique.mockResolvedValue({
        userId: 'u2',
        role: 'member',
      });
      prisma.tenantMember.delete.mockResolvedValue({});

      const result = await service.removeMember(tenantId, 'u2', 'owner');

      expect(result.message).toBe('Member removed');
    });

    it('should throw ForbiddenException when removing owner', async () => {
      prisma.tenantMember.findUnique.mockResolvedValue({
        userId: 'u1',
        role: 'owner',
      });

      await expect(
        service.removeMember(tenantId, 'u1', 'owner'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException for member role requester', async () => {
      await expect(
        service.removeMember(tenantId, 'u2', 'member'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if member not found', async () => {
      prisma.tenantMember.findUnique.mockResolvedValue(null);

      await expect(
        service.removeMember(tenantId, 'bad-id', 'owner'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
