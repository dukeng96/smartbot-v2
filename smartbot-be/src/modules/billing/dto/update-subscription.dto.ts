import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

export class UpdateSubscriptionDto {
  @ApiPropertyOptional({ enum: ['weekly', 'monthly', 'yearly'] })
  @IsOptional()
  @IsString()
  @IsIn(['weekly', 'monthly', 'yearly'])
  billingCycle?: string;
}
