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
exports.AnalyticsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const current_tenant_decorator_1 = require("../../common/decorators/current-tenant.decorator");
const analytics_service_1 = require("./analytics.service");
const analytics_query_dto_1 = require("./dto/analytics-query.dto");
let AnalyticsController = class AnalyticsController {
    analyticsService;
    constructor(analyticsService) {
        this.analyticsService = analyticsService;
    }
    getOverview(tenantId) {
        return this.analyticsService.getOverview(tenantId);
    }
    getConversations(tenantId, query) {
        return this.analyticsService.getConversationsOverTime(tenantId, query.period, query.botId);
    }
    getMessages(tenantId, query) {
        return this.analyticsService.getMessagesOverTime(tenantId, query.period, query.botId);
    }
    getCredits(tenantId, query) {
        return this.analyticsService.getCreditsOverTime(tenantId, query.period);
    }
    getChannels(tenantId, query) {
        return this.analyticsService.getChannelBreakdown(tenantId, query.period);
    }
    getTopQuestions(tenantId, botId, query) {
        return this.analyticsService.getTopQuestions(tenantId, botId, query.limit);
    }
    getSatisfaction(tenantId, botId) {
        return this.analyticsService.getSatisfaction(tenantId, botId);
    }
};
exports.AnalyticsController = AnalyticsController;
__decorate([
    (0, common_1.Get)('overview'),
    (0, swagger_1.ApiOperation)({ summary: 'Dashboard KPI overview' }),
    __param(0, (0, current_tenant_decorator_1.CurrentTenant)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AnalyticsController.prototype, "getOverview", null);
__decorate([
    (0, common_1.Get)('conversations'),
    (0, swagger_1.ApiOperation)({ summary: 'Conversations over time' }),
    __param(0, (0, current_tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, analytics_query_dto_1.AnalyticsQueryDto]),
    __metadata("design:returntype", void 0)
], AnalyticsController.prototype, "getConversations", null);
__decorate([
    (0, common_1.Get)('messages'),
    (0, swagger_1.ApiOperation)({ summary: 'Message volume over time' }),
    __param(0, (0, current_tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, analytics_query_dto_1.AnalyticsQueryDto]),
    __metadata("design:returntype", void 0)
], AnalyticsController.prototype, "getMessages", null);
__decorate([
    (0, common_1.Get)('credits'),
    (0, swagger_1.ApiOperation)({ summary: 'Credit usage over time' }),
    __param(0, (0, current_tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, analytics_query_dto_1.AnalyticsQueryDto]),
    __metadata("design:returntype", void 0)
], AnalyticsController.prototype, "getCredits", null);
__decorate([
    (0, common_1.Get)('channels'),
    (0, swagger_1.ApiOperation)({ summary: 'Conversation breakdown by channel' }),
    __param(0, (0, current_tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, analytics_query_dto_1.AnalyticsQueryDto]),
    __metadata("design:returntype", void 0)
], AnalyticsController.prototype, "getChannels", null);
__decorate([
    (0, common_1.Get)('bots/:botId/top-questions'),
    (0, swagger_1.ApiOperation)({ summary: 'Most asked questions for bot' }),
    __param(0, (0, current_tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('botId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, analytics_query_dto_1.TopQuestionsQueryDto]),
    __metadata("design:returntype", void 0)
], AnalyticsController.prototype, "getTopQuestions", null);
__decorate([
    (0, common_1.Get)('bots/:botId/satisfaction'),
    (0, swagger_1.ApiOperation)({ summary: 'Rating satisfaction distribution' }),
    __param(0, (0, current_tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('botId', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], AnalyticsController.prototype, "getSatisfaction", null);
exports.AnalyticsController = AnalyticsController = __decorate([
    (0, swagger_1.ApiTags)('Analytics'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('api/v1/analytics'),
    __metadata("design:paramtypes", [analytics_service_1.AnalyticsService])
], AnalyticsController);
//# sourceMappingURL=analytics.controller.js.map