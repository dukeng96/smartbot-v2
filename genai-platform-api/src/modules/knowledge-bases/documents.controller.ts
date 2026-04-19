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
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { DocumentsService } from './documents.service';
import { CreateDocumentUrlDto } from './dto/create-document-url.dto';
import { CreateDocumentTextDto } from './dto/create-document-text.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';

@ApiTags('Documents')
@ApiBearerAuth()
@Controller('api/v1/knowledge-bases/:kbId/documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOperation({ summary: 'Upload file document' })
  uploadFile(
    @CurrentTenant() tenantId: string,
    @Param('kbId', ParseUUIDPipe) kbId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.documentsService.uploadFile(tenantId, kbId, file);
  }

  @Post('url')
  @ApiOperation({ summary: 'Create document from URL' })
  createFromUrl(
    @CurrentTenant() tenantId: string,
    @Param('kbId', ParseUUIDPipe) kbId: string,
    @Body() dto: CreateDocumentUrlDto,
  ) {
    return this.documentsService.createFromUrl(tenantId, kbId, dto.url);
  }

  @Post('text')
  @ApiOperation({ summary: 'Create document from text' })
  createFromText(
    @CurrentTenant() tenantId: string,
    @Param('kbId', ParseUUIDPipe) kbId: string,
    @Body() dto: CreateDocumentTextDto,
  ) {
    return this.documentsService.createFromText(
      tenantId,
      kbId,
      dto.content,
      dto.name,
    );
  }

  @Get()
  @ApiOperation({ summary: 'List documents in knowledge base' })
  findAll(
    @CurrentTenant() tenantId: string,
    @Param('kbId', ParseUUIDPipe) kbId: string,
    @Query() query: PaginationDto,
  ) {
    return this.documentsService.findAll(tenantId, kbId, query);
  }

  @Get(':docId')
  @ApiOperation({ summary: 'Get document detail' })
  findOne(
    @CurrentTenant() tenantId: string,
    @Param('kbId', ParseUUIDPipe) kbId: string,
    @Param('docId', ParseUUIDPipe) docId: string,
  ) {
    return this.documentsService.findOne(tenantId, kbId, docId);
  }

  @Patch(':docId')
  @ApiOperation({ summary: 'Update document (toggle enabled, metadata)' })
  update(
    @CurrentTenant() tenantId: string,
    @Param('kbId', ParseUUIDPipe) kbId: string,
    @Param('docId', ParseUUIDPipe) docId: string,
    @Body() dto: UpdateDocumentDto,
  ) {
    return this.documentsService.update(tenantId, kbId, docId, dto);
  }

  @Delete(':docId')
  @ApiOperation({ summary: 'Soft delete document' })
  remove(
    @CurrentTenant() tenantId: string,
    @Param('kbId', ParseUUIDPipe) kbId: string,
    @Param('docId', ParseUUIDPipe) docId: string,
  ) {
    return this.documentsService.softDelete(tenantId, kbId, docId);
  }

  @Post(':docId/reprocess')
  @ApiOperation({ summary: 'Re-process single document' })
  reprocess(
    @CurrentTenant() tenantId: string,
    @Param('kbId', ParseUUIDPipe) kbId: string,
    @Param('docId', ParseUUIDPipe) docId: string,
  ) {
    return this.documentsService.reprocess(tenantId, kbId, docId);
  }

  @Get(':docId/chunks')
  @ApiOperation({ summary: 'Get document chunks from vector store' })
  getChunks(
    @CurrentTenant() tenantId: string,
    @Param('kbId', ParseUUIDPipe) kbId: string,
    @Param('docId', ParseUUIDPipe) docId: string,
    @Query() query: PaginationDto,
  ) {
    return this.documentsService.getChunks(tenantId, kbId, docId, query);
  }
}
