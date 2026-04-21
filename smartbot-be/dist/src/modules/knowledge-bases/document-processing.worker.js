"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var DocumentProcessingWorker_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentProcessingWorker = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
let DocumentProcessingWorker = DocumentProcessingWorker_1 = class DocumentProcessingWorker extends bullmq_1.WorkerHost {
    configService;
    logger = new common_1.Logger(DocumentProcessingWorker_1.name);
    aiEngineUrl;
    internalApiKey;
    constructor(configService) {
        super();
        this.configService = configService;
        this.aiEngineUrl =
            this.configService.get('aiEngine.url') || 'http://localhost:8000';
        this.internalApiKey =
            this.configService.get('aiEngine.internalApiKey') || 'internal-secret-key';
    }
    async process(job) {
        const { documentId, knowledgeBaseId, tenantId, ...params } = job.data;
        this.logger.log(`Processing document ${documentId} for KB ${knowledgeBaseId} (job ${job.id})`);
        try {
            const url = `${this.aiEngineUrl}/engine/v1/documents/process`;
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
                    throw new Error(`AI Engine responded ${response.status}: ${text}`);
                }
                this.logger.log(`Document ${documentId} accepted by AI Engine. Awaiting callback for status updates.`);
            }
            finally {
                clearTimeout(timeout);
            }
        }
        catch (error) {
            this.logger.error(`Failed to process document ${documentId}: ${error.message}`, error.stack);
            throw error;
        }
    }
};
exports.DocumentProcessingWorker = DocumentProcessingWorker;
exports.DocumentProcessingWorker = DocumentProcessingWorker = DocumentProcessingWorker_1 = __decorate([
    (0, common_1.Injectable)(),
    (0, bullmq_1.Processor)('document-processing'),
    __metadata("design:paramtypes", [config_1.ConfigService])
], DocumentProcessingWorker);
//# sourceMappingURL=document-processing.worker.js.map