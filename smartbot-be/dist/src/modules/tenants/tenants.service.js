"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
let TenantsService = class TenantsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getTenant(tenantId) {
        const tenant = await this.prisma.tenant.findUnique({
            where: { id: tenantId },
            include: {
                plan: { select: { id: true, name: true, slug: true } },
                _count: { select: { bots: true, members: true, knowledgeBases: true } },
            },
        });
        if (!tenant)
            throw new common_1.NotFoundException('Tenant not found');
        return tenant;
    }
    async updateTenant(tenantId, tenantRole, dto) {
        if (!['owner', 'admin'].includes(tenantRole)) {
            throw new common_1.ForbiddenException('Only owner or admin can update tenant');
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
    async listMembers(tenantId) {
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
    async inviteMember(tenantId, tenantRole, dto) {
        if (!['owner', 'admin'].includes(tenantRole)) {
            throw new common_1.ForbiddenException('Only owner or admin can invite members');
        }
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
        const existing = await this.prisma.tenantMember.findUnique({
            where: { tenantId_userId: { tenantId, userId: user.id } },
        });
        if (existing) {
            throw new common_1.ForbiddenException('User is already a member of this tenant');
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
    async updateMemberRole(tenantId, targetUserId, tenantRole, dto) {
        if (tenantRole !== 'owner') {
            throw new common_1.ForbiddenException('Only owner can change member roles');
        }
        const member = await this.prisma.tenantMember.findUnique({
            where: { tenantId_userId: { tenantId, userId: targetUserId } },
        });
        if (!member)
            throw new common_1.NotFoundException('Member not found');
        if (member.role === 'owner') {
            throw new common_1.ForbiddenException('Cannot change owner role');
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
    async removeMember(tenantId, targetUserId, tenantRole) {
        if (!['owner', 'admin'].includes(tenantRole)) {
            throw new common_1.ForbiddenException('Only owner or admin can remove members');
        }
        const member = await this.prisma.tenantMember.findUnique({
            where: { tenantId_userId: { tenantId, userId: targetUserId } },
        });
        if (!member)
            throw new common_1.NotFoundException('Member not found');
        if (member.role === 'owner') {
            throw new common_1.ForbiddenException('Cannot remove owner');
        }
        await this.prisma.tenantMember.delete({
            where: { tenantId_userId: { tenantId, userId: targetUserId } },
        });
        return { message: 'Member removed' };
    }
};
exports.TenantsService = TenantsService;
exports.TenantsService = TenantsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], TenantsService);
//# sourceMappingURL=tenants.service.js.map