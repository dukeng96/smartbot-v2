import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class TopUpCreditsDto {
  @ApiProperty({ example: 1000, minimum: 100 })
  @IsInt()
  @Min(100)
  amount: number;

  @ApiPropertyOptional({ enum: ['vnpay', 'momo', 'bank_transfer'] })
  @IsOptional()
  @IsString()
  paymentMethod?: string;
}
