import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsObject, IsOptional, IsString } from 'class-validator';

export class UpdateChannelDto {
  @ApiPropertyOptional({
    enum: ['active', 'inactive', 'error'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['active', 'inactive', 'error'])
  status?: string;

  @ApiPropertyOptional({ example: { pageId: '456' } })
  @IsOptional()
  @IsObject()
  config?: Record<string, any>;
}
