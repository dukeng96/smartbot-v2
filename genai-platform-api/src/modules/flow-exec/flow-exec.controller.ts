import { Body, Controller, Param, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { FlowExecService } from './flow-exec.service';

class ResumeFlowDto {
  @IsString()
  @MaxLength(4000)
  approval: string;
}

@ApiTags('Flow Execution')
@ApiBearerAuth()
@Controller('api/v1/flow-exec')
export class FlowExecController {
  constructor(private readonly flowExecService: FlowExecService) {}

  @Post(':execId/resume')
  @ApiOperation({ summary: 'Resume a suspended human_input flow' })
  async resume(
    @Param('execId') execId: string,
    @Body() dto: ResumeFlowDto,
    @CurrentTenant() tenantId: string,
    @Res() res: Response,
  ) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    for await (const event of this.flowExecService.resumeExecution(execId, tenantId, dto.approval)) {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    }
    res.end();
  }
}
