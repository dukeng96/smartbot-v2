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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentsController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const swagger_1 = require("@nestjs/swagger");
const current_tenant_decorator_1 = require("../../common/decorators/current-tenant.decorator");
const documents_service_1 = require("./documents.service");
const create_document_url_dto_1 = require("./dto/create-document-url.dto");
const create_document_text_dto_1 = require("./dto/create-document-text.dto");
const update_document_dto_1 = require("./dto/update-document.dto");
const pagination_dto_1 = require("../../common/dto/pagination.dto");
let DocumentsController = class DocumentsController {
    documentsService;
    constructor(documentsService) {
        this.documentsService = documentsService;
    }
    uploadFile(tenantId, kbId, file) {
        return this.documentsService.uploadFile(tenantId, kbId, file);
    }
    createFromUrl(tenantId, kbId, dto) {
        return this.documentsService.createFromUrl(tenantId, kbId, dto.url);
    }
    createFromText(tenantId, kbId, dto) {
        return this.documentsService.createFromText(tenantId, kbId, dto.content, dto.name);
    }
    findAll(tenantId, kbId, query) {
        return this.documentsService.findAll(tenantId, kbId, query);
    }
    findOne(tenantId, kbId, docId) {
        return this.documentsService.findOne(tenantId, kbId, docId);
    }
    update(tenantId, kbId, docId, dto) {
        return this.documentsService.update(tenantId, kbId, docId, dto);
    }
    remove(tenantId, kbId, docId) {
        return this.documentsService.softDelete(tenantId, kbId, docId);
    }
    reprocess(tenantId, kbId, docId) {
        return this.documentsService.reprocess(tenantId, kbId, docId);
    }
};
exports.DocumentsController = DocumentsController;
__decorate([
    (0, common_1.Post)('upload'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            properties: { file: { type: 'string', format: 'binary' } },
        },
    }),
    (0, swagger_1.ApiOperation)({ summary: 'Upload file document' }),
    __param(0, (0, current_tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('kbId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], DocumentsController.prototype, "uploadFile", null);
__decorate([
    (0, common_1.Post)('url'),
    (0, swagger_1.ApiOperation)({ summary: 'Create document from URL' }),
    __param(0, (0, current_tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('kbId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, create_document_url_dto_1.CreateDocumentUrlDto]),
    __metadata("design:returntype", void 0)
], DocumentsController.prototype, "createFromUrl", null);
__decorate([
    (0, common_1.Post)('text'),
    (0, swagger_1.ApiOperation)({ summary: 'Create document from text' }),
    __param(0, (0, current_tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('kbId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, create_document_text_dto_1.CreateDocumentTextDto]),
    __metadata("design:returntype", void 0)
], DocumentsController.prototype, "createFromText", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'List documents in knowledge base' }),
    __param(0, (0, current_tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('kbId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, pagination_dto_1.PaginationDto]),
    __metadata("design:returntype", void 0)
], DocumentsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':docId'),
    (0, swagger_1.ApiOperation)({ summary: 'Get document detail' }),
    __param(0, (0, current_tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('kbId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Param)('docId', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], DocumentsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':docId'),
    (0, swagger_1.ApiOperation)({ summary: 'Update document (toggle enabled, metadata)' }),
    __param(0, (0, current_tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('kbId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Param)('docId', common_1.ParseUUIDPipe)),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, update_document_dto_1.UpdateDocumentDto]),
    __metadata("design:returntype", void 0)
], DocumentsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':docId'),
    (0, swagger_1.ApiOperation)({ summary: 'Soft delete document' }),
    __param(0, (0, current_tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('kbId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Param)('docId', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], DocumentsController.prototype, "remove", null);
__decorate([
    (0, common_1.Post)(':docId/reprocess'),
    (0, swagger_1.ApiOperation)({ summary: 'Re-process single document' }),
    __param(0, (0, current_tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('kbId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Param)('docId', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], DocumentsController.prototype, "reprocess", null);
exports.DocumentsController = DocumentsController = __decorate([
    (0, swagger_1.ApiTags)('Documents'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('api/v1/knowledge-bases/:kbId/documents'),
    __metadata("design:paramtypes", [documents_service_1.DocumentsService])
], DocumentsController);
//# sourceMappingURL=documents.controller.js.map