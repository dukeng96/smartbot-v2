import { IsIn, IsObject, IsOptional, IsString, Length } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { FlowData } from '../types/flow-data.types';

export class CreateFlowDto {
  @ApiProperty()
  @IsString()
  @Length(1, 255)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: ['agentflow', 'chatflow'], default: 'agentflow' })
  @IsOptional()
  @IsIn(['agentflow', 'chatflow'])
  type?: 'agentflow' | 'chatflow' = 'agentflow';

  @ApiProperty()
  @IsObject()
  flowData: FlowData;
}
