"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const core_1 = require("@nestjs/core");
const bullmq_1 = require("@nestjs/bullmq");
const config_2 = require("./config");
const prisma_module_1 = require("./common/prisma/prisma.module");
const storage_module_1 = require("./modules/storage/storage.module");
const jwt_auth_guard_1 = require("./common/guards/jwt-auth.guard");
const transform_interceptor_1 = require("./common/interceptors/transform.interceptor");
const http_exception_filter_1 = require("./common/filters/http-exception.filter");
const auth_module_1 = require("./modules/auth/auth.module");
const users_module_1 = require("./modules/users/users.module");
const tenants_module_1 = require("./modules/tenants/tenants.module");
const bots_module_1 = require("./modules/bots/bots.module");
const knowledge_bases_module_1 = require("./modules/knowledge-bases/knowledge-bases.module");
const conversations_module_1 = require("./modules/conversations/conversations.module");
const analytics_module_1 = require("./modules/analytics/analytics.module");
const billing_module_1 = require("./modules/billing/billing.module");
const channels_module_1 = require("./modules/channels/channels.module");
const chat_proxy_module_1 = require("./modules/chat-proxy/chat-proxy.module");
const app_controller_1 = require("./app.controller");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                load: [config_2.appConfig, config_2.databaseConfig, config_2.redisConfig, config_2.s3Config, config_2.jwtConfig, config_2.aiEngineConfig],
            }),
            bullmq_1.BullModule.forRoot({
                connection: {
                    host: process.env.REDIS_HOST || 'localhost',
                    port: parseInt(process.env.REDIS_PORT || '6379', 10),
                },
            }),
            prisma_module_1.PrismaModule,
            storage_module_1.StorageModule,
            auth_module_1.AuthModule,
            users_module_1.UsersModule,
            tenants_module_1.TenantsModule,
            bots_module_1.BotsModule,
            knowledge_bases_module_1.KnowledgeBasesModule,
            conversations_module_1.ConversationsModule,
            analytics_module_1.AnalyticsModule,
            billing_module_1.BillingModule,
            channels_module_1.ChannelsModule,
            chat_proxy_module_1.ChatProxyModule,
        ],
        controllers: [app_controller_1.AppController],
        providers: [
            { provide: core_1.APP_GUARD, useClass: jwt_auth_guard_1.JwtAuthGuard },
            { provide: core_1.APP_INTERCEPTOR, useClass: transform_interceptor_1.TransformInterceptor },
            { provide: core_1.APP_FILTER, useClass: http_exception_filter_1.AllExceptionsFilter },
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map