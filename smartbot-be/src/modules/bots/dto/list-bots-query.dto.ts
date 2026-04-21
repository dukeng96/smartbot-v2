import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class ListBotsQueryDto extends PaginationDto {
  @ApiPropertyOptional({ enum: ['draft', 'active', 'paused', 'archived'] })
  @IsOptional()
  @IsString()
  @IsIn(['draft', 'active', 'paused', 'archived'])
  status?: string;
}
