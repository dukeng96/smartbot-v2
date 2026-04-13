import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { FlowsService } from './flows.service';
import { CreateFlowDto } from './dto/create-flow.dto';
import { UpdateFlowDto } from './dto/update-flow.dto';

@ApiTags('Flows')
@ApiBearerAuth()
@Controller('api/v1/flows')
export class FlowsController {
  constructor(private readonly flowsService: FlowsService) {}

  @Post()
  @ApiOperation({ summary: 'Create flow' })
  create(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: CreateFlowDto,
  ) {
    return this.flowsService.create(tenantId, user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List flows (tenant-scoped, paginated)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @CurrentTenant() tenantId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.flowsService.findAll(
      tenantId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get flow detail' })
  findOne(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.flowsService.findOne(tenantId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update flow (name, description, flowData)' })
  update(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFlowDto,
  ) {
    return this.flowsService.update(tenantId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete flow (rejected if bot references it)' })
  remove(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.flowsService.remove(tenantId, id);
  }

  @Post(':id/duplicate')
  @ApiOperation({ summary: 'Duplicate flow' })
  duplicate(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.flowsService.duplicate(tenantId, user.id, id);
  }

  @Post(':id/validate')
  @ApiOperation({ summary: 'Validate flow DAG (NestJS-side checks only)' })
  validate(
    @CurrentTenant() tenantId: string,
    @Body() dto: UpdateFlowDto,
  ) {
    if (!dto.flowData) {
      return { valid: true, errors: [] };
    }
    try {
      this.flowsService.validateFlowData(dto.flowData);
      return { valid: true, errors: [] };
    } catch (e: any) {
      return { valid: false, errors: [e.message] };
    }
  }
}
