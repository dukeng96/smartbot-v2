import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TenantsService } from './tenants.service';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';

@ApiTags('Tenants')
@ApiBearerAuth()
@Controller('api/v1/tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get tenant details' })
  getTenant(@Param('id', ParseUUIDPipe) id: string) {
    return this.tenantsService.getTenant(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update tenant (admin+)' })
  updateTenant(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTenantDto,
    @Req() req: any,
  ) {
    return this.tenantsService.updateTenant(id, req.tenantRole, dto);
  }

  @Get(':id/members')
  @ApiOperation({ summary: 'List tenant members' })
  listMembers(@Param('id', ParseUUIDPipe) id: string) {
    return this.tenantsService.listMembers(id);
  }

  @Post(':id/members')
  @ApiOperation({ summary: 'Invite member to tenant' })
  inviteMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: InviteMemberDto,
    @Req() req: any,
  ) {
    return this.tenantsService.inviteMember(id, req.tenantRole, dto);
  }

  @Patch(':id/members/:userId')
  @ApiOperation({ summary: 'Update member role (owner only)' })
  updateMemberRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: UpdateMemberRoleDto,
    @Req() req: any,
  ) {
    return this.tenantsService.updateMemberRole(
      id,
      userId,
      req.tenantRole,
      dto,
    );
  }

  @Delete(':id/members/:userId')
  @ApiOperation({ summary: 'Remove member from tenant' })
  removeMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Req() req: any,
  ) {
    return this.tenantsService.removeMember(id, userId, req.tenantRole);
  }
}
