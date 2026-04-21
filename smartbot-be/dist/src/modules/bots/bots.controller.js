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
exports.BotsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const current_tenant_decorator_1 = require("../../common/decorators/current-tenant.decorator");
const quota_guard_1 = require("../../common/guards/quota.guard");
const quota_type_decorator_1 = require("../../common/decorators/quota-type.decorator");
const bots_service_1 = require("./bots.service");
const create_bot_dto_1 = require("./dto/create-bot.dto");
const update_bot_dto_1 = require("./dto/update-bot.dto");
const update_personality_dto_1 = require("./dto/update-personality.dto");
const update_widget_dto_1 = require("./dto/update-widget.dto");
const attach_knowledge_base_dto_1 = require("./dto/attach-knowledge-base.dto");
const list_bots_query_dto_1 = require("./dto/list-bots-query.dto");
let BotsController = class BotsController {
    botsService;
    constructor(botsService) {
        this.botsService = botsService;
    }
    create(tenantId, dto) {
        return this.botsService.create(tenantId, dto);
    }
    findAll(tenantId, query) {
        return this.botsService.findAll(tenantId, query);
    }
    findOne(tenantId, id) {
        return this.botsService.findOne(tenantId, id);
    }
    update(tenantId, id, dto) {
        return this.botsService.update(tenantId, id, dto);
    }
    remove(tenantId, id) {
        return this.botsService.softDelete(tenantId, id);
    }
    duplicate(tenantId, id) {
        return this.botsService.duplicate(tenantId, id);
    }
    getPersonality(tenantId, id) {
        return this.botsService.getPersonality(tenantId, id);
    }
    updatePersonality(tenantId, id, dto) {
        return this.botsService.updatePersonality(tenantId, id, dto);
    }
    updateWidget(tenantId, id, dto) {
        return this.botsService.updateWidget(tenantId, id, dto);
    }
    getWidgetPreview(tenantId, id) {
        return this.botsService.getWidgetPreview(tenantId, id);
    }
    generateApiKey(tenantId, id) {
        return this.botsService.generateApiKey(tenantId, id);
    }
    revokeApiKey(tenantId, id) {
        return this.botsService.revokeApiKey(tenantId, id);
    }
    getEmbedCode(tenantId, id) {
        return this.botsService.getEmbedCode(tenantId, id);
    }
    attachKnowledgeBase(tenantId, id, dto) {
        return this.botsService.attachKnowledgeBase(tenantId, id, dto);
    }
    detachKnowledgeBase(tenantId, id, kbId) {
        return this.botsService.detachKnowledgeBase(tenantId, id, kbId);
    }
    listKnowledgeBases(tenantId, id) {
        return this.botsService.listKnowledgeBases(tenantId, id);
    }
};
exports.BotsController = BotsController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseGuards)(quota_guard_1.QuotaGuard),
    (0, quota_type_decorator_1.QuotaType)('bot_create'),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new bot' }),
    __param(0, (0, current_tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_bot_dto_1.CreateBotDto]),
    __metadata("design:returntype", void 0)
], BotsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'List bots' }),
    __param(0, (0, current_tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, list_bots_query_dto_1.ListBotsQueryDto]),
    __metadata("design:returntype", void 0)
], BotsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get bot detail' }),
    __param(0, (0, current_tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], BotsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Update bot' }),
    __param(0, (0, current_tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, update_bot_dto_1.UpdateBotDto]),
    __metadata("design:returntype", void 0)
], BotsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Soft delete bot' }),
    __param(0, (0, current_tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], BotsController.prototype, "remove", null);
__decorate([
    (0, common_1.Post)(':id/duplicate'),
    (0, common_1.UseGuards)(quota_guard_1.QuotaGuard),
    (0, quota_type_decorator_1.QuotaType)('bot_create'),
    (0, swagger_1.ApiOperation)({ summary: 'Duplicate bot' }),
    __param(0, (0, current_tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], BotsController.prototype, "duplicate", null);
__decorate([
    (0, common_1.Get)(':id/personality'),
    (0, swagger_1.ApiOperation)({ summary: 'Get personality config' }),
    __param(0, (0, current_tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], BotsController.prototype, "getPersonality", null);
__decorate([
    (0, common_1.Patch)(':id/personality'),
    (0, swagger_1.ApiOperation)({ summary: 'Update personality config' }),
    __param(0, (0, current_tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, update_personality_dto_1.UpdatePersonalityDto]),
    __metadata("design:returntype", void 0)
], BotsController.prototype, "updatePersonality", null);
__decorate([
    (0, common_1.Patch)(':id/widget'),
    (0, swagger_1.ApiOperation)({ summary: 'Update widget config' }),
    __param(0, (0, current_tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, update_widget_dto_1.UpdateWidgetDto]),
    __metadata("design:returntype", void 0)
], BotsController.prototype, "updateWidget", null);
__decorate([
    (0, common_1.Get)(':id/widget/preview'),
    (0, swagger_1.ApiOperation)({ summary: 'Preview widget HTML' }),
    __param(0, (0, current_tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], BotsController.prototype, "getWidgetPreview", null);
__decorate([
    (0, common_1.Post)(':id/api-key'),
    (0, swagger_1.ApiOperation)({ summary: 'Generate API key (returned once)' }),
    __param(0, (0, current_tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], BotsController.prototype, "generateApiKey", null);
__decorate([
    (0, common_1.Delete)(':id/api-key'),
    (0, swagger_1.ApiOperation)({ summary: 'Revoke API key' }),
    __param(0, (0, current_tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], BotsController.prototype, "revokeApiKey", null);
__decorate([
    (0, common_1.Get)(':id/embed-code'),
    (0, swagger_1.ApiOperation)({ summary: 'Get embed code snippets' }),
    __param(0, (0, current_tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], BotsController.prototype, "getEmbedCode", null);
__decorate([
    (0, common_1.Post)(':id/knowledge-bases'),
    (0, swagger_1.ApiOperation)({ summary: 'Attach knowledge base to bot' }),
    __param(0, (0, current_tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, attach_knowledge_base_dto_1.AttachKnowledgeBaseDto]),
    __metadata("design:returntype", void 0)
], BotsController.prototype, "attachKnowledgeBase", null);
__decorate([
    (0, common_1.Delete)(':id/knowledge-bases/:kbId'),
    (0, swagger_1.ApiOperation)({ summary: 'Detach knowledge base' }),
    __param(0, (0, current_tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Param)('kbId', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], BotsController.prototype, "detachKnowledgeBase", null);
__decorate([
    (0, common_1.Get)(':id/knowledge-bases'),
    (0, swagger_1.ApiOperation)({ summary: 'List attached knowledge bases' }),
    __param(0, (0, current_tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], BotsController.prototype, "listKnowledgeBases", null);
exports.BotsController = BotsController = __decorate([
    (0, swagger_1.ApiTags)('Bots'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('api/v1/bots'),
    __metadata("design:paramtypes", [bots_service_1.BotsService])
], BotsController);
//# sourceMappingURL=bots.controller.js.map