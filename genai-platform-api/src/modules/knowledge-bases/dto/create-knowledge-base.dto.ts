import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class CreateKnowledgeBaseDto {
  @ApiProperty({ example: 'Product Documentation' })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ default: 500, minimum: 100, maximum: 2000 })
  @IsOptional()
  @IsInt()
  @Min(100)
  @Max(2000)
  chunkSize?: number;

  @ApiPropertyOptional({ default: 50, minimum: 0, maximum: 500 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(500)
  chunkOverlap?: number;
}
