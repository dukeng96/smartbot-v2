import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsObject, IsOptional, IsString, Max, Min } from 'class-validator';
import { Transform } from 'class-transformer';

/**
 * DTO for AI Engine callbacks.
 *
 * The AI Engine (Python/FastAPI) sends snake_case field names.
 * NestJS global pipe has `forbidNonWhitelisted: true`, so we accept
 * snake_case aliases via @Transform and strip them in the controller
 * before validation.
 *
 * AI Engine statuses: extracting | chunking | embedding | completed | error
 * We map the granular processing statuses to "processing" for DB storage,
 * while preserving the original step in `processingStep`.
 */

const PROCESSING_STATUSES = ['extracting', 'chunking', 'embedding'];

export class UpdateDocumentStatusDto {
  @ApiProperty({ enum: ['pending', 'processing', 'completed', 'error'] })
  @IsString()
  @Transform(({ value }) =>
    PROCESSING_STATUSES.includes(value) ? 'processing' : value,
  )
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

  @ApiPropertyOptional({ description: 'Extraction metadata from AI Engine (pages, language, etc.)' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
