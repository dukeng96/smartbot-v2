import { Module } from '@nestjs/common';
import { BotsModule } from '../bots/bots.module';
import { ConversationsModule } from '../conversations/conversations.module';
import { FlowExecModule } from '../flow-exec/flow-exec.module';
import { ChatProxyController } from './chat-proxy.controller';
import { ChatProxyService } from './chat-proxy.service';

@Module({
  imports: [BotsModule, ConversationsModule, FlowExecModule],
  controllers: [ChatProxyController],
  providers: [ChatProxyService],
})
export class ChatProxyModule {}
