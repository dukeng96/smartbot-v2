import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateBotDto {
  @ApiProperty({ example: 'Customer Support Bot' })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ example: 'Handles customer queries' })
  @IsOptional()
  @IsString()
  description?: string;
}
