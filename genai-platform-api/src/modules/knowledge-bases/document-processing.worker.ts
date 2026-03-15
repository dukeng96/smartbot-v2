import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';

@Injectable()
@Processor('document-processing')
export class DocumentProcessingWorker extends WorkerHost {
  private readonly logger = new Logger(DocumentProcessingWorker.name);
  private readonly aiEngineUrl: string;

  constructor(private readonly configService: ConfigService) {
    super();
    this.aiEngineUrl = this.configService.get<string>('aiEngine.url') || 'http://localhost:8000';
  }

  async process(job: Job): Promise<void> {
    const { documentId, knowledgeBaseId, tenantId, ...params } = job.data;

    this.logger.log(
      `Processing document ${documentId} for KB ${knowledgeBaseId} (job ${job.id})`,
    );

    try {
      // Mock: POST to AI Engine /engine/v1/documents/process
      // In production, replace with actual HTTP call:
      // const response = await fetch(`${this.aiEngineUrl}/engine/v1/documents/process`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json', 'X-Internal-Key': internalKey },
      //   body: JSON.stringify({ documentId, knowledgeBaseId, tenantId, ...params }),
      // });

      this.logger.log(
        `[MOCK] POST ${this.aiEngineUrl}/engine/v1/documents/process — ` +
        `documentId=${documentId}, knowledgeBaseId=${knowledgeBaseId}, ` +
        `tenantId=${tenantId}, params=${JSON.stringify(params)}`,
      );

      // AI Engine will callback PATCH /api/v1/internal/documents/:id/status
      // to update processing progress and final status
      this.logger.log(
        `Document ${documentId} sent to AI Engine. Awaiting callback for status updates.`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to process document ${documentId}: ${error.message}`,
        error.stack,
      );
      throw error; // BullMQ will retry based on job config (3 attempts, exponential backoff)
    }
  }
}
