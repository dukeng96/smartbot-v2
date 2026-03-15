import { Body, Controller, Param, ParseUUIDPipe, Patch, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InternalApiKeyGuard } from '../../common/guards/internal-api-key.guard';
import { Public } from '../../common/decorators/public.decorator';
import { DocumentsService } from './documents.service';
import { UpdateDocumentStatusDto } from './dto/update-document-status.dto';

@ApiTags('Internal — AI Engine Callbacks')
@Controller('api/v1/internal/documents')
@Public()
@UseGuards(InternalApiKeyGuard)
@ApiHeader({ name: 'X-Internal-Key', required: true })
export class InternalDocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update document processing status (AI Engine callback)' })
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDocumentStatusDto,
  ) {
    return this.documentsService.updateStatus(id, dto);
  }
}
