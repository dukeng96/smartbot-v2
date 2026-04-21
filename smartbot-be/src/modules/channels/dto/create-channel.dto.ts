import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateChannelDto {
  @ApiProperty({
    example: 'facebook_messenger',
    enum: ['web_widget', 'facebook_messenger', 'telegram', 'zalo', 'api'],
  })
  @IsString()
  @IsIn(['web_widget', 'facebook_messenger', 'telegram', 'zalo', 'api'])
  type: string;

  @ApiPropertyOptional({ example: { pageId: '123', accessToken: 'abc' } })
  @IsOptional()
  @IsObject()
  config?: Record<string, any>;
}
