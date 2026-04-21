"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.KnowledgeBasesModule = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("@nestjs/bullmq");
const knowledge_bases_service_1 = require("./knowledge-bases.service");
const documents_service_1 = require("./documents.service");
const knowledge_bases_controller_1 = require("./knowledge-bases.controller");
const documents_controller_1 = require("./documents.controller");
const internal_documents_controller_1 = require("./internal-documents.controller");
const document_processing_worker_1 = require("./document-processing.worker");
let KnowledgeBasesModule = class KnowledgeBasesModule {
};
exports.KnowledgeBasesModule = KnowledgeBasesModule;
exports.KnowledgeBasesModule = KnowledgeBasesModule = __decorate([
    (0, common_1.Module)({
        imports: [
            bullmq_1.BullModule.registerQueue({ name: 'document-processing' }),
        ],
        controllers: [
            knowledge_bases_controller_1.KnowledgeBasesController,
            documents_controller_1.DocumentsController,
            internal_documents_controller_1.InternalDocumentsController,
        ],
        providers: [
            knowledge_bases_service_1.KnowledgeBasesService,
            documents_service_1.DocumentsService,
            document_processing_worker_1.DocumentProcessingWorker,
        ],
        exports: [knowledge_bases_service_1.KnowledgeBasesService, documents_service_1.DocumentsService],
    })
], KnowledgeBasesModule);
//# sourceMappingURL=knowledge-bases.module.js.map