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
var WebhooksController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhooksController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const public_decorator_1 = require("../../common/decorators/public.decorator");
let WebhooksController = WebhooksController_1 = class WebhooksController {
    logger = new common_1.Logger(WebhooksController_1.name);
    facebookVerify(mode, verifyToken, challenge) {
        const expectedToken = process.env.FB_VERIFY_TOKEN || 'smartbot-fb-verify';
        if (mode === 'subscribe' && verifyToken === expectedToken) {
            this.logger.log('Facebook webhook verified');
            return challenge;
        }
        this.logger.warn('Facebook webhook verification failed');
        return 'Verification failed';
    }
    facebookWebhook(body) {
        this.logger.log(`[STUB] Facebook webhook: ${JSON.stringify(body).slice(0, 200)}`);
        return { status: 'EVENT_RECEIVED' };
    }
    telegramWebhook(body) {
        this.logger.log(`[STUB] Telegram webhook: ${JSON.stringify(body).slice(0, 200)}`);
        return { ok: true };
    }
    zaloWebhook(body) {
        this.logger.log(`[STUB] Zalo webhook: ${JSON.stringify(body).slice(0, 200)}`);
        return { error: 0, message: 'success' };
    }
};
exports.WebhooksController = WebhooksController;
__decorate([
    (0, common_1.Get)('facebook'),
    (0, swagger_1.ApiOperation)({ summary: 'Facebook verification challenge' }),
    __param(0, (0, common_1.Query)('hub.mode')),
    __param(1, (0, common_1.Query)('hub.verify_token')),
    __param(2, (0, common_1.Query)('hub.challenge')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], WebhooksController.prototype, "facebookVerify", null);
__decorate([
    (0, common_1.Post)('facebook'),
    (0, swagger_1.ApiOperation)({ summary: 'Facebook message webhook' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], WebhooksController.prototype, "facebookWebhook", null);
__decorate([
    (0, common_1.Post)('telegram'),
    (0, swagger_1.ApiOperation)({ summary: 'Telegram update webhook' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], WebhooksController.prototype, "telegramWebhook", null);
__decorate([
    (0, common_1.Post)('zalo'),
    (0, swagger_1.ApiOperation)({ summary: 'Zalo event webhook' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], WebhooksController.prototype, "zaloWebhook", null);
exports.WebhooksController = WebhooksController = WebhooksController_1 = __decorate([
    (0, swagger_1.ApiTags)('Webhooks'),
    (0, common_1.Controller)('api/v1/webhooks'),
    (0, public_decorator_1.Public)()
], WebhooksController);
//# sourceMappingURL=webhooks.controller.js.map