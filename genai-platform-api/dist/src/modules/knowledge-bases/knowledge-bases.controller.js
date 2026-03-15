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
exports.KnowledgeBasesController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const current_tenant_decorator_1 = require("../../common/decorators/current-tenant.decorator");
const knowledge_bases_service_1 = require("./knowledge-bases.service");
const documents_service_1 = require("./documents.service");
const create_knowledge_base_dto_1 = require("./dto/create-knowledge-base.dto");
const update_knowledge_base_dto_1 = require("./dto/update-knowledge-base.dto");
const pagination_dto_1 = require("../../common/dto/pagination.dto");
let KnowledgeBasesController = class KnowledgeBasesController {
    kbService;
    documentsService;
    constructor(kbService, documentsService) {
        this.kbService = kbService;
        this.documentsService = documentsService;
    }
    create(tenantId, dto) {
        return this.kbService.create(tenantId, dto);
    }
    findAll(tenantId, query) {
        return this.kbService.findAll(tenantId, query);
    }
    findOne(tenantId, id) {
        return this.kbService.findOne(tenantId, id);
    }
    update(tenantId, id, dto) {
        return this.kbService.update(tenantId, id, dto);
    }
    remove(tenantId, id) {
        return this.kbService.softDelete(tenantId, id);
    }
    reprocessAll(tenantId, id) {
        return this.documentsService.reprocessAll(tenantId, id);
    }
};
exports.KnowledgeBasesController = KnowledgeBasesController;
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create knowledge base' }),
    __param(0, (0, current_tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_knowledge_base_dto_1.CreateKnowledgeBaseDto]),
    __metadata("design:returntype", void 0)
], KnowledgeBasesController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'List knowledge bases' }),
    __param(0, (0, current_tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, pagination_dto_1.PaginationDto]),
    __metadata("design:returntype", void 0)
], KnowledgeBasesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get knowledge base detail' }),
    __param(0, (0, current_tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], KnowledgeBasesController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Update knowledge base' }),
    __param(0, (0, current_tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, update_knowledge_base_dto_1.UpdateKnowledgeBaseDto]),
    __metadata("design:returntype", void 0)
], KnowledgeBasesController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Soft delete knowledge base' }),
    __param(0, (0, current_tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], KnowledgeBasesController.prototype, "remove", null);
__decorate([
    (0, common_1.Post)(':id/reprocess-all'),
    (0, swagger_1.ApiOperation)({ summary: 'Re-process all documents in KB' }),
    __param(0, (0, current_tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], KnowledgeBasesController.prototype, "reprocessAll", null);
exports.KnowledgeBasesController = KnowledgeBasesController = __decorate([
    (0, swagger_1.ApiTags)('Knowledge Bases'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('api/v1/knowledge-bases'),
    __metadata("design:paramtypes", [knowledge_bases_service_1.KnowledgeBasesService,
        documents_service_1.DocumentsService])
], KnowledgeBasesController);
//# sourceMappingURL=knowledge-bases.controller.js.map