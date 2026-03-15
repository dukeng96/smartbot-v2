import { TenantsService } from './tenants.service';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
export declare class TenantsController {
    private readonly tenantsService;
    constructor(tenantsService: TenantsService);
    getTenant(id: string): Promise<{
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
    updateTenant(id: string, dto: UpdateTenantDto, req: any): Promise<{
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
    listMembers(id: string): Promise<({
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
    inviteMember(id: string, dto: InviteMemberDto, req: any): Promise<{
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
    updateMemberRole(id: string, userId: string, dto: UpdateMemberRoleDto, req: any): Promise<{
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
    removeMember(id: string, userId: string, req: any): Promise<{
        message: string;
    }>;
}
