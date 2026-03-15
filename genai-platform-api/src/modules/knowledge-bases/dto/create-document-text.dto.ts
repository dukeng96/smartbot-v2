import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateDocumentTextDto {
  @ApiProperty({ example: 'Product FAQ content goes here...' })
  @IsString()
  content: string;

  @ApiPropertyOptional({ example: 'FAQ Document' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  name?: string;
}
