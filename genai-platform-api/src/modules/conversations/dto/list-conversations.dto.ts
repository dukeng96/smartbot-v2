import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class ListConversationsDto extends PaginationDto {
  @ApiPropertyOptional({
    enum: ['web_widget', 'facebook', 'telegram', 'zalo', 'api'],
  })
  @IsOptional()
  @IsString()
  channel?: string;

  @ApiPropertyOptional({ enum: ['active', 'closed', 'archived'] })
  @IsOptional()
  @IsString()
  @IsIn(['active', 'closed', 'archived'])
  status?: string;

  @ApiPropertyOptional({ example: '2025-01-01' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ example: '2025-12-31' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;
}
