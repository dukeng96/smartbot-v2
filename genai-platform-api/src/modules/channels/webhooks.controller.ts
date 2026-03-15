import { Body, Controller, Get, Logger, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Webhooks')
@Controller('api/v1/webhooks')
@Public()
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  @Get('facebook')
  @ApiOperation({ summary: 'Facebook verification challenge' })
  facebookVerify(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') verifyToken: string,
    @Query('hub.challenge') challenge: string,
  ) {
    // Stub: In production, verify against stored token
    const expectedToken = process.env.FB_VERIFY_TOKEN || 'smartbot-fb-verify';

    if (mode === 'subscribe' && verifyToken === expectedToken) {
      this.logger.log('Facebook webhook verified');
      return challenge;
    }

    this.logger.warn('Facebook webhook verification failed');
    return 'Verification failed';
  }

  @Post('facebook')
  @ApiOperation({ summary: 'Facebook message webhook' })
  facebookWebhook(@Body() body: Record<string, any>) {
    // Stub: Parse FB messaging events → route to bot → proxy to AI Engine
    this.logger.log(`[STUB] Facebook webhook: ${JSON.stringify(body).slice(0, 200)}`);
    return { status: 'EVENT_RECEIVED' };
  }

  @Post('telegram')
  @ApiOperation({ summary: 'Telegram update webhook' })
  telegramWebhook(@Body() body: Record<string, any>) {
    // Stub: Parse Telegram update → route to bot → proxy to AI Engine
    this.logger.log(`[STUB] Telegram webhook: ${JSON.stringify(body).slice(0, 200)}`);
    return { ok: true };
  }

  @Post('zalo')
  @ApiOperation({ summary: 'Zalo event webhook' })
  zaloWebhook(@Body() body: Record<string, any>) {
    // Stub: Parse Zalo event → route to bot → proxy to AI Engine
    this.logger.log(`[STUB] Zalo webhook: ${JSON.stringify(body).slice(0, 200)}`);
    return { error: 0, message: 'success' };
  }
}
