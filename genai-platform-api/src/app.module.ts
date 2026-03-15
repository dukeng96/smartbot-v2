import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { BullModule } from '@nestjs/bullmq';

// Config
import {
  appConfig,
  databaseConfig,
  redisConfig,
  minioConfig,
  jwtConfig,
  aiEngineConfig,
} from './config';

// Global modules
import { PrismaModule } from './common/prisma/prisma.module';
import { StorageModule } from './modules/storage/storage.module';

// Guards
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';

// Interceptors & Filters
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';

// Feature modules
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { BotsModule } from './modules/bots/bots.module';
import { KnowledgeBasesModule } from './modules/knowledge-bases/knowledge-bases.module';
import { ConversationsModule } from './modules/conversations/conversations.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { BillingModule } from './modules/billing/billing.module';
import { ChannelsModule } from './modules/channels/channels.module';
import { ChatProxyModule } from './modules/chat-proxy/chat-proxy.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, redisConfig, minioConfig, jwtConfig, aiEngineConfig],
    }),

    // BullMQ (Redis-backed queues)
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
      },
    }),

    // Global infrastructure
    PrismaModule,
    StorageModule,

    // Feature modules
    AuthModule,
    UsersModule,
    TenantsModule,
    BotsModule,
    KnowledgeBasesModule,
    ConversationsModule,
    AnalyticsModule,
    BillingModule,
    ChannelsModule,
    ChatProxyModule,
  ],
  controllers: [AppController],
  providers: [
    // Global JWT guard — @Public() decorator opts out
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    // Wrap all responses in { data } envelope
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
    // Global exception handler
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
