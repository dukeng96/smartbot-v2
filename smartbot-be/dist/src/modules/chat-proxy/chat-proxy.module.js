"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatProxyModule = void 0;
const common_1 = require("@nestjs/common");
const bots_module_1 = require("../bots/bots.module");
const conversations_module_1 = require("../conversations/conversations.module");
const billing_module_1 = require("../billing/billing.module");
const chat_proxy_controller_1 = require("./chat-proxy.controller");
const chat_proxy_service_1 = require("./chat-proxy.service");
let ChatProxyModule = class ChatProxyModule {
};
exports.ChatProxyModule = ChatProxyModule;
exports.ChatProxyModule = ChatProxyModule = __decorate([
    (0, common_1.Module)({
        imports: [bots_module_1.BotsModule, conversations_module_1.ConversationsModule, billing_module_1.BillingModule],
        controllers: [chat_proxy_controller_1.ChatProxyController],
        providers: [chat_proxy_service_1.ChatProxyService],
    })
], ChatProxyModule);
//# sourceMappingURL=chat-proxy.module.js.map