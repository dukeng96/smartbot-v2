import {
  IsIn,
  IsObject,
  IsString,
  Length,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CREDENTIAL_TYPE_VALUES } from '../credential-types';

export class CreateCredentialDto {
  @ApiProperty({ example: 'My VNPT Key' })
  @IsString()
  @Length(1, 128)
  name: string;

  @ApiProperty({ enum: CREDENTIAL_TYPE_VALUES })
  @IsIn(CREDENTIAL_TYPE_VALUES)
  credentialType: string;

  @ApiProperty({ example: { apiKey: 'sk-...', baseUrl: 'https://...' } })
  @IsObject()
  data: Record<string, string>;
}
