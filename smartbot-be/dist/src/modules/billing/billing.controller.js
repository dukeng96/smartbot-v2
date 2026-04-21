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
exports.BillingController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const public_decorator_1 = require("../../common/decorators/public.decorator");
const current_tenant_decorator_1 = require("../../common/decorators/current-tenant.decorator");
const billing_service_1 = require("./billing.service");
const subscribe_dto_1 = require("./dto/subscribe.dto");
const update_subscription_dto_1 = require("./dto/update-subscription.dto");
const top_up_credits_dto_1 = require("./dto/top-up-credits.dto");
const pagination_dto_1 = require("../../common/dto/pagination.dto");
let BillingController = class BillingController {
    billingService;
    constructor(billingService) {
        this.billingService = billingService;
    }
    listPlans() {
        return this.billingService.listPlans();
    }
    getSubscription(tenantId) {
        return this.billingService.getCurrentSubscription(tenantId);
    }
    subscribe(tenantId, dto) {
        return this.billingService.subscribe(tenantId, dto);
    }
    updateSubscription(tenantId, dto) {
        return this.billingService.updateSubscription(tenantId, dto);
    }
    cancelSubscription(tenantId) {
        return this.billingService.cancelSubscription(tenantId);
    }
    topUpCredits(tenantId, dto) {
        return this.billingService.topUpCredits(tenantId, dto);
    }
    getCreditUsage(tenantId) {
        return this.billingService.getCreditUsage(tenantId);
    }
    getPayments(tenantId, query) {
        return this.billingService.getPaymentHistory(tenantId, query);
    }
    vnpayCallback(body) {
        return this.billingService.handleVnpayCallback(body);
    }
    momoCallback(body) {
        return this.billingService.handleMomoCallback(body);
    }
};
exports.BillingController = BillingController;
__decorate([
    (0, common_1.Get)('plans'),
    (0, public_decorator_1.Public)(),
    (0, swagger_1.ApiOperation)({ summary: 'List available plans with pricing' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], BillingController.prototype, "listPlans", null);
__decorate([
    (0, common_1.Get)('subscription'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get current subscription + credit usage' }),
    __param(0, (0, current_tenant_decorator_1.CurrentTenant)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], BillingController.prototype, "getSubscription", null);
__decorate([
    (0, common_1.Post)('subscription'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Subscribe or upgrade plan' }),
    __param(0, (0, current_tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, subscribe_dto_1.SubscribeDto]),
    __metadata("design:returntype", void 0)
], BillingController.prototype, "subscribe", null);
__decorate([
    (0, common_1.Patch)('subscription'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Update billing cycle' }),
    __param(0, (0, current_tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_subscription_dto_1.UpdateSubscriptionDto]),
    __metadata("design:returntype", void 0)
], BillingController.prototype, "updateSubscription", null);
__decorate([
    (0, common_1.Delete)('subscription'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Cancel subscription at period end' }),
    __param(0, (0, current_tenant_decorator_1.CurrentTenant)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], BillingController.prototype, "cancelSubscription", null);
__decorate([
    (0, common_1.Post)('credits/top-up'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Purchase additional credits' }),
    __param(0, (0, current_tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, top_up_credits_dto_1.TopUpCreditsDto]),
    __metadata("design:returntype", void 0)
], BillingController.prototype, "topUpCredits", null);
__decorate([
    (0, common_1.Get)('credits/usage'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Current period credit usage' }),
    __param(0, (0, current_tenant_decorator_1.CurrentTenant)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], BillingController.prototype, "getCreditUsage", null);
__decorate([
    (0, common_1.Get)('payments'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Payment history' }),
    __param(0, (0, current_tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, pagination_dto_1.PaginationDto]),
    __metadata("design:returntype", void 0)
], BillingController.prototype, "getPayments", null);
__decorate([
    (0, common_1.Post)('payments/vnpay/callback'),
    (0, public_decorator_1.Public)(),
    (0, swagger_1.ApiOperation)({ summary: 'VNPay IPN callback (public)' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], BillingController.prototype, "vnpayCallback", null);
__decorate([
    (0, common_1.Post)('payments/momo/callback'),
    (0, public_decorator_1.Public)(),
    (0, swagger_1.ApiOperation)({ summary: 'MoMo IPN callback (public)' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], BillingController.prototype, "momoCallback", null);
exports.BillingController = BillingController = __decorate([
    (0, swagger_1.ApiTags)('Billing'),
    (0, common_1.Controller)('api/v1'),
    __metadata("design:paramtypes", [billing_service_1.BillingService])
], BillingController);
//# sourceMappingURL=billing.controller.js.map