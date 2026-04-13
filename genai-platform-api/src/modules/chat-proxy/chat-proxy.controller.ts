import {
  Body,
  Controller,
  Get,
  Headers,
  Logger,
  Param,
  ParseUUIDPipe,
  Post,
  Res,
} from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { ChatProxyService } from './chat-proxy.service';
import { ChatDto } from './dto/chat.dto';

@ApiTags('Chat — Public Widget API')
@Controller('api/v1/chat')
@Public()
export class ChatProxyController {
  private readonly logger = new Logger(ChatProxyController.name);

  constructor(private readonly chatProxyService: ChatProxyService) {}

  @Get(':botId/config')
  @ApiOperation({
    summary: 'Widget loads bot config (name, avatar, greeting, suggestions)',
  })
  getBotConfig(
    @Param('botId', ParseUUIDPipe) botId: string,
    @Headers('referer') referer?: string,
  ) {
    const refererHost = referer ? this.extractHost(referer) : undefined;
    return this.chatProxyService.getBotConfig(botId, refererHost);
  }

  @Post(':botId/messages')
  @ApiOperation({ summary: 'Send message, receive SSE stream' })
  @ApiHeader({
    name: 'X-Bot-Api-Key',
    required: false,
    description: 'Bot API key for auth',
  })
  async chat(
    @Param('botId', ParseUUIDPipe) botId: string,
    @Body() dto: ChatDto,
    @Res() res: Response,
  ) {
    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    try {
      const stream = this.chatProxyService.processChat({
        botId,
        message: dto.message,
        conversationId: dto.conversationId,
        endUserId: dto.endUserId,
        endUserName: dto.endUserName,
      });

      for await (const event of stream) {
        res.write(`event: ${event.event}\ndata: ${event.data}\n\n`);
      }
    } catch (error) {
      this.logger.error(
        `Chat error for bot ${botId}: ${error.message}`,
        error.stack,
      );
      res.write(
        `event: error\ndata: ${JSON.stringify({ error: error.message })}\n\n`,
      );
    } finally {
      res.end();
    }
  }

  @Get(':botId/conversations/:convId/messages')
  @ApiOperation({ summary: 'Load conversation history for returning user' })
  getConversationMessages(
    @Param('botId', ParseUUIDPipe) botId: string,
    @Param('convId', ParseUUIDPipe) convId: string,
    @Headers('x-end-user-id') endUserId?: string,
  ) {
    return this.chatProxyService.getConversationHistory(
      botId,
      convId,
      endUserId,
    );
  }

  private extractHost(referer: string): string | undefined {
    try {
      return new URL(referer).hostname;
    } catch {
      return undefined;
    }
  }
}
