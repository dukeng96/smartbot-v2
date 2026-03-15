import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class AnalyticsQueryDto {
  @ApiPropertyOptional({ default: '7d', enum: ['1d', '7d', '14d', '30d', '90d'] })
  @IsOptional()
  @IsString()
  @IsIn(['1d', '7d', '14d', '30d', '90d'])
  period: string = '7d';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  botId?: string;
}

export class TopQuestionsQueryDto {
  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;
}
