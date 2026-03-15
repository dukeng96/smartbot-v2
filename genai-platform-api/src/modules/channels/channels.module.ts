import { Module } from '@nestjs/common';
import { ChannelsService } from './channels.service';
import { ChannelsController } from './channels.controller';
import { WebhooksController } from './webhooks.controller';

@Module({
  controllers: [ChannelsController, WebhooksController],
  providers: [ChannelsService],
  exports: [ChannelsService],
})
export class ChannelsModule {}
