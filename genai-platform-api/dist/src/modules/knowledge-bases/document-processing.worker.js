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
    constructor(configService) {
        super();
        this.configService = configService;
        this.aiEngineUrl = this.configService.get('aiEngine.url') || 'http://localhost:8000';
    }
    async process(job) {
        const { documentId, knowledgeBaseId, tenantId, ...params } = job.data;
        this.logger.log(`Processing document ${documentId} for KB ${knowledgeBaseId} (job ${job.id})`);
        try {
            this.logger.log(`[MOCK] POST ${this.aiEngineUrl}/engine/v1/documents/process — ` +
                `documentId=${documentId}, knowledgeBaseId=${knowledgeBaseId}, ` +
                `tenantId=${tenantId}, params=${JSON.stringify(params)}`);
            this.logger.log(`Document ${documentId} sent to AI Engine. Awaiting callback for status updates.`);
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