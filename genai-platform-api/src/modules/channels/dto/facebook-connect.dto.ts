import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class FacebookConnectDto {
  @ApiProperty({ example: '123456789', description: 'Facebook Page ID' })
  @IsString()
  pageId: string;

  @ApiProperty({ description: 'Facebook Page Access Token' })
  @IsString()
  accessToken: string;
}
