import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';

@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) {}

  async getTenant(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        plan: { select: { id: true, name: true, slug: true } },
        _count: { select: { bots: true, members: true, knowledgeBases: true } },
      },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');
    return tenant;
  }

  async updateTenant(
    tenantId: string,
    tenantRole: string,
    dto: UpdateTenantDto,
  ) {
    if (!['owner', 'admin'].includes(tenantRole)) {
      throw new ForbiddenException('Only owner or admin can update tenant');
    }
    return this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.logoUrl !== undefined && { logoUrl: dto.logoUrl }),
        ...(dto.settings !== undefined && { settings: dto.settings }),
      },
    });
  }

  async listMembers(tenantId: string) {
    return this.prisma.tenantMember.findMany({
      where: { tenantId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async inviteMember(tenantId: string, tenantRole: string, dto: InviteMemberDto) {
    if (!['owner', 'admin'].includes(tenantRole)) {
      throw new ForbiddenException('Only owner or admin can invite members');
    }

    // Find or create user by email
    let user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email: dto.email,
          status: 'active',
          authProvider: 'email',
        },
      });
    }

    // Check if already a member
    const existing = await this.prisma.tenantMember.findUnique({
      where: { tenantId_userId: { tenantId, userId: user.id } },
    });

    if (existing) {
      throw new ForbiddenException('User is already a member of this tenant');
    }

    return this.prisma.tenantMember.create({
      data: {
        tenantId,
        userId: user.id,
        role: dto.role || 'member',
        status: 'invited',
      },
      include: {
        user: {
          select: { id: true, email: true, fullName: true, avatarUrl: true },
        },
      },
    });
  }

  async updateMemberRole(
    tenantId: string,
    targetUserId: string,
    tenantRole: string,
    dto: UpdateMemberRoleDto,
  ) {
    if (tenantRole !== 'owner') {
      throw new ForbiddenException('Only owner can change member roles');
    }

    const member = await this.prisma.tenantMember.findUnique({
      where: { tenantId_userId: { tenantId, userId: targetUserId } },
    });

    if (!member) throw new NotFoundException('Member not found');
    if (member.role === 'owner') {
      throw new ForbiddenException('Cannot change owner role');
    }

    return this.prisma.tenantMember.update({
      where: { tenantId_userId: { tenantId, userId: targetUserId } },
      data: { role: dto.role },
      include: {
        user: {
          select: { id: true, email: true, fullName: true, avatarUrl: true },
        },
      },
    });
  }

  async removeMember(
    tenantId: string,
    targetUserId: string,
    tenantRole: string,
  ) {
    if (!['owner', 'admin'].includes(tenantRole)) {
      throw new ForbiddenException('Only owner or admin can remove members');
    }

    const member = await this.prisma.tenantMember.findUnique({
      where: { tenantId_userId: { tenantId, userId: targetUserId } },
    });

    if (!member) throw new NotFoundException('Member not found');
    if (member.role === 'owner') {
      throw new ForbiddenException('Cannot remove owner');
    }

    await this.prisma.tenantMember.delete({
      where: { tenantId_userId: { tenantId, userId: targetUserId } },
    });

    return { message: 'Member removed' };
  }
}
