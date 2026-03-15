import { PrismaService } from '../../common/prisma/prisma.service';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
export declare class TenantsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getTenant(tenantId: string): Promise<{
        plan: {
            name: string;
            id: string;
            slug: string;
        } | null;
        _count: {
            members: number;
            bots: number;
            knowledgeBases: number;
        };
    } & {
        name: string;
        id: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        slug: string;
        logoUrl: string | null;
        settings: import("@prisma/client/runtime/client").JsonValue;
        ownerId: string;
        planId: string | null;
        deletedAt: Date | null;
    }>;
    updateTenant(tenantId: string, tenantRole: string, dto: UpdateTenantDto): Promise<{
        name: string;
        id: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        slug: string;
        logoUrl: string | null;
        settings: import("@prisma/client/runtime/client").JsonValue;
        ownerId: string;
        planId: string | null;
        deletedAt: Date | null;
    }>;
    listMembers(tenantId: string): Promise<({
        user: {
            email: string;
            fullName: string | null;
            id: string;
            avatarUrl: string | null;
        };
    } & {
        id: string;
        status: string;
        createdAt: Date;
        tenantId: string;
        userId: string;
        role: string;
        invitedAt: Date;
        joinedAt: Date | null;
    })[]>;
    inviteMember(tenantId: string, tenantRole: string, dto: InviteMemberDto): Promise<{
        user: {
            email: string;
            fullName: string | null;
            id: string;
            avatarUrl: string | null;
        };
    } & {
        id: string;
        status: string;
        createdAt: Date;
        tenantId: string;
        userId: string;
        role: string;
        invitedAt: Date;
        joinedAt: Date | null;
    }>;
    updateMemberRole(tenantId: string, targetUserId: string, tenantRole: string, dto: UpdateMemberRoleDto): Promise<{
        user: {
            email: string;
            fullName: string | null;
            id: string;
            avatarUrl: string | null;
        };
    } & {
        id: string;
        status: string;
        createdAt: Date;
        tenantId: string;
        userId: string;
        role: string;
        invitedAt: Date;
        joinedAt: Date | null;
    }>;
    removeMember(tenantId: string, targetUserId: string, tenantRole: string): Promise<{
        message: string;
    }>;
}
