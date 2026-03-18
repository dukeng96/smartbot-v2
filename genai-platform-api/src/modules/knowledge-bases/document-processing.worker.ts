import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';

@Injectable()
@Processor('document-processing')
export class DocumentProcessingWorker extends WorkerHost {
  private readonly logger = new Logger(DocumentProcessingWorker.name);
  private readonly aiEngineUrl: string;
  private readonly internalApiKey: string;

  constructor(private readonly configService: ConfigService) {
    super();
    this.aiEngineUrl =
      this.configService.get<string>('aiEngine.url') || 'http://localhost:8000';
    this.internalApiKey =
      this.configService.get<string>('aiEngine.internalApiKey') || 'internal-secret-key';
  }

  async process(job: Job): Promise<void> {
    const { documentId, knowledgeBaseId, tenantId, ...params } = job.data;

    this.logger.log(
      `Processing document ${documentId} for KB ${knowledgeBaseId} (job ${job.id})`,
    );

    try {
      const url = `${this.aiEngineUrl}/engine/v1/documents/process`;

      // AI Engine (FastAPI/Pydantic) expects snake_case field names
      const body = {
        document_id: documentId,
        knowledge_base_id: knowledgeBaseId,
        tenant_id: tenantId,
        source_type: params.sourceType,
        storage_path: params.storagePath,
        source_url: params.sourceUrl,
        raw_text: params.textContent,
        mime_type: params.mimeType,
        chunk_size: params.chunkSize,
        chunk_overlap: params.chunkOverlap,
        reprocess: params.reprocess,
      };

      this.logger.log(`POST ${url} — documentId=${documentId}`);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30_000);

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Internal-Key': this.internalApiKey,
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        if (!response.ok) {
          const text = await response.text().catch(() => '');
          throw new Error(
            `AI Engine responded ${response.status}: ${text}`,
          );
        }

        this.logger.log(
          `Document ${documentId} accepted by AI Engine. Awaiting callback for status updates.`,
        );
      } finally {
        clearTimeout(timeout);
      }
    } catch (error) {
      this.logger.error(
        `Failed to process document ${documentId}: ${error.message}`,
        error.stack,
      );
      throw error; // BullMQ retries: 3 attempts, exponential backoff
    }
  }
}
