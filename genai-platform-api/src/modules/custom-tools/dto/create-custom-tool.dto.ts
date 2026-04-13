import {
  IsObject,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCustomToolDto {
  @ApiProperty({ description: 'snake_case tool identifier shown to LLM agent' })
  @IsString()
  @Length(1, 128)
  @Matches(/^[a-z][a-z0-9_]*$/, {
    message: 'name must be snake_case (lowercase letters, digits, underscores)',
  })
  name: string;

  @ApiPropertyOptional({ description: 'Description shown to the LLM agent' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiProperty({ description: 'JSON Schema for tool arguments' })
  @IsObject()
  schema: Record<string, any>;

  @ApiProperty({ description: 'RestrictedPython source — executed in engine sandbox' })
  @IsString()
  @MaxLength(20000)
  implementation: string;
}
