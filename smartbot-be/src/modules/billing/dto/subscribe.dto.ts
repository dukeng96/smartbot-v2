import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, IsUUID } from 'class-validator';

export class SubscribeDto {
  @ApiProperty({ example: 'uuid-of-plan' })
  @IsUUID()
  planId: string;

  @ApiProperty({ enum: ['weekly', 'monthly', 'yearly'], default: 'monthly' })
  @IsString()
  @IsIn(['weekly', 'monthly', 'yearly'])
  billingCycle: string;

  @ApiPropertyOptional({ enum: ['vnpay', 'momo', 'bank_transfer'] })
  @IsOptional()
  @IsString()
  paymentMethod?: string;
}
