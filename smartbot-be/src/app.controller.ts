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
      service: 'smartbot-be',
      timestamp: new Date().toISOString(),
    };
  }
}
