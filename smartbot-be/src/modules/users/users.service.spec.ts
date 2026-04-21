import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { createPrismaMock } from '../../common/testing/prisma-mock.helper';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: ReturnType<typeof createPrismaMock>;

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    fullName: 'Test User',
    avatarUrl: null,
    phone: null,
    emailVerified: false,
    authProvider: 'email',
    status: 'active',
    lastLoginAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    prisma = createPrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  describe('getProfile', () => {
    it('should return user profile', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.getProfile('user-1');

      expect(result.email).toBe('test@example.com');
      expect(prisma.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'user-1' } }),
      );
    });

    it('should throw NotFoundException if user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getProfile('no-user')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateProfile', () => {
    it('should update user profile fields', async () => {
      const updatedUser = { ...mockUser, fullName: 'New Name' };
      prisma.user.update.mockResolvedValue(updatedUser);

      const result = await service.updateProfile('user-1', {
        fullName: 'New Name',
      });

      expect(result.fullName).toBe('New Name');
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-1' },
          data: { fullName: 'New Name' },
        }),
      );
    });

    it('should handle partial updates', async () => {
      prisma.user.update.mockResolvedValue({
        ...mockUser,
        phone: '0901234567',
      });

      const result = await service.updateProfile('user-1', {
        phone: '0901234567',
      });

      expect(result.phone).toBe('0901234567');
    });

    it('should not include undefined fields in update', async () => {
      prisma.user.update.mockResolvedValue(mockUser);

      await service.updateProfile('user-1', {});

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: {} }),
      );
    });
  });
});
