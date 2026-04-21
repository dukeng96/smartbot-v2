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
exports.InternalDocumentsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const internal_api_key_guard_1 = require("../../common/guards/internal-api-key.guard");
const public_decorator_1 = require("../../common/decorators/public.decorator");
const snake_to_camel_interceptor_1 = require("../../common/interceptors/snake-to-camel.interceptor");
const documents_service_1 = require("./documents.service");
const update_document_status_dto_1 = require("./dto/update-document-status.dto");
let InternalDocumentsController = class InternalDocumentsController {
    documentsService;
    constructor(documentsService) {
        this.documentsService = documentsService;
    }
    updateStatus(id, dto) {
        return this.documentsService.updateStatus(id, dto);
    }
};
exports.InternalDocumentsController = InternalDocumentsController;
__decorate([
    (0, common_1.Patch)(':id/status'),
    (0, swagger_1.ApiOperation)({ summary: 'Update document processing status (AI Engine callback)' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_document_status_dto_1.UpdateDocumentStatusDto]),
    __metadata("design:returntype", void 0)
], InternalDocumentsController.prototype, "updateStatus", null);
exports.InternalDocumentsController = InternalDocumentsController = __decorate([
    (0, swagger_1.ApiTags)('Internal — AI Engine Callbacks'),
    (0, common_1.Controller)('api/v1/internal/documents'),
    (0, public_decorator_1.Public)(),
    (0, common_1.UseGuards)(internal_api_key_guard_1.InternalApiKeyGuard),
    (0, common_1.UseInterceptors)(snake_to_camel_interceptor_1.SnakeToCamelInterceptor),
    (0, swagger_1.ApiHeader)({ name: 'X-Internal-Key', required: true }),
    __metadata("design:paramtypes", [documents_service_1.DocumentsService])
], InternalDocumentsController);
//# sourceMappingURL=internal-documents.controller.js.map