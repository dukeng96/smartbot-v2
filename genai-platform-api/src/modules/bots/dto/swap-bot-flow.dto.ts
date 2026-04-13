import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SwapBotFlowDto {
  @ApiProperty({ description: 'ID of the flow to attach to this bot' })
  @IsUUID()
  flowId: string;
}
