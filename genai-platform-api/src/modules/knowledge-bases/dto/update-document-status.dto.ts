import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpdateDocumentStatusDto {
  @ApiProperty({ enum: ['pending', 'processing', 'completed', 'error'] })
  @IsString()
  @IsIn(['pending', 'processing', 'completed', 'error'])
  status: string;

  @ApiPropertyOptional({ enum: ['extracting', 'chunking', 'embedding'] })
  @IsOptional()
  @IsString()
  processingStep?: string;

  @ApiPropertyOptional({ minimum: 0, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  processingProgress?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  errorMessage?: string;

  @ApiPropertyOptional()
  @IsOptional()
  charCount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  chunkCount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  markdownStoragePath?: string;
}
