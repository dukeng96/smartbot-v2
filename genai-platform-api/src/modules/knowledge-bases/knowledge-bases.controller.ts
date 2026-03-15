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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { KnowledgeBasesService } from './knowledge-bases.service';
import { DocumentsService } from './documents.service';
import { CreateKnowledgeBaseDto } from './dto/create-knowledge-base.dto';
import { UpdateKnowledgeBaseDto } from './dto/update-knowledge-base.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';

@ApiTags('Knowledge Bases')
@ApiBearerAuth()
@Controller('api/v1/knowledge-bases')
export class KnowledgeBasesController {
  constructor(
    private readonly kbService: KnowledgeBasesService,
    private readonly documentsService: DocumentsService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create knowledge base' })
  create(@CurrentTenant() tenantId: string, @Body() dto: CreateKnowledgeBaseDto) {
    return this.kbService.create(tenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List knowledge bases' })
  findAll(@CurrentTenant() tenantId: string, @Query() query: PaginationDto) {
    return this.kbService.findAll(tenantId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get knowledge base detail' })
  findOne(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.kbService.findOne(tenantId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update knowledge base' })
  update(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateKnowledgeBaseDto,
  ) {
    return this.kbService.update(tenantId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete knowledge base' })
  remove(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.kbService.softDelete(tenantId, id);
  }

  @Post(':id/reprocess-all')
  @ApiOperation({ summary: 'Re-process all documents in KB' })
  reprocessAll(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.documentsService.reprocessAll(tenantId, id);
  }
}
