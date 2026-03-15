import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class GoogleOAuthDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  idToken: string;
}
