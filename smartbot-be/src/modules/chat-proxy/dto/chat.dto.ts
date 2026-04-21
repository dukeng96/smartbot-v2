import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class ChatDto {
  @ApiProperty({ example: 'Xin chào, tôi cần hỗ trợ', maxLength: 10000 })
  @IsString()
  @MaxLength(10000)
  message: string;

  @ApiPropertyOptional({ description: 'Existing conversation ID to continue' })
  @IsOptional()
  @IsUUID()
  conversationId?: string;

  @ApiPropertyOptional({ description: 'End user identifier for widget users' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  endUserId?: string;

  @ApiPropertyOptional({ description: 'End user display name' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  endUserName?: string;
}
