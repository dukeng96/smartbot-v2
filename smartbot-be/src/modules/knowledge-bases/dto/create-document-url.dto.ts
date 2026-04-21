import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUrl } from 'class-validator';

export class CreateDocumentUrlDto {
  @ApiProperty({ example: 'https://example.com/docs/faq' })
  @IsString()
  @IsUrl()
  url: string;
}
