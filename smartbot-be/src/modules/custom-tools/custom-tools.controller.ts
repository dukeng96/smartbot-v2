import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CustomToolsService } from './custom-tools.service';
import { CreateCustomToolDto } from './dto/create-custom-tool.dto';
import { UpdateCustomToolDto } from './dto/update-custom-tool.dto';

@ApiTags('Custom Tools')
@ApiBearerAuth()
@Controller('api/v1/custom-tools')
export class CustomToolsController {
  constructor(private readonly customToolsService: CustomToolsService) {}

  @Post()
  @ApiOperation({ summary: 'Create custom tool' })
  create(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: CreateCustomToolDto,
  ) {
    return this.customToolsService.create(tenantId, user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List custom tools (tenant-scoped)' })
  findAll(@CurrentTenant() tenantId: string) {
    return this.customToolsService.findAll(tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get custom tool detail (includes implementation)' })
  findOne(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.customToolsService.findOne(tenantId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update custom tool' })
  update(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCustomToolDto,
  ) {
    return this.customToolsService.update(tenantId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete custom tool (blocked if referenced by agent node)' })
  remove(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.customToolsService.remove(tenantId, id);
  }
}
