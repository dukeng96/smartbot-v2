import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from './common/decorators/public.decorator';

@ApiTags('Health')
@Controller()
export class AppController {
  @Get()
  @Public()
  @ApiOperation({ summary: 'Health check' })
  health() {
    return {
      status: 'ok',
      service: 'genai-platform-api',
      timestamp: new Date().toISOString(),
    };
  }
}
