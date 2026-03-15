import { Module } from '@nestjs/common';
import { BotsModule } from '../bots/bots.module';
import { ConversationsModule } from '../conversations/conversations.module';
import { BillingModule } from '../billing/billing.module';
import { ChatProxyController } from './chat-proxy.controller';
import { ChatProxyService } from './chat-proxy.service';

@Module({
  imports: [BotsModule, ConversationsModule, BillingModule],
  controllers: [ChatProxyController],
  providers: [ChatProxyService],
})
export class ChatProxyModule {}
