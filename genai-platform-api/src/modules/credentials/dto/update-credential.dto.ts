import { IsObject, IsOptional, IsString, Length } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateCredentialDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 128)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  data?: Record<string, string>;
}
