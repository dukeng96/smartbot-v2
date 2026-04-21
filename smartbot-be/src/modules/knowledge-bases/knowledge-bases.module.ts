import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { KnowledgeBasesService } from './knowledge-bases.service';
import { DocumentsService } from './documents.service';
import { KnowledgeBasesController } from './knowledge-bases.controller';
import { DocumentsController } from './documents.controller';
import { InternalDocumentsController } from './internal-documents.controller';
import { DocumentProcessingWorker } from './document-processing.worker';

@Module({
  imports: [BullModule.registerQueue({ name: 'document-processing' })],
  controllers: [
    KnowledgeBasesController,
    DocumentsController,
    InternalDocumentsController,
  ],
  providers: [
    KnowledgeBasesService,
    DocumentsService,
    DocumentProcessingWorker,
  ],
  exports: [KnowledgeBasesService, DocumentsService],
})
export class KnowledgeBasesModule {}
