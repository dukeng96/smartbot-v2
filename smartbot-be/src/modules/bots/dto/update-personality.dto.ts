import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString } from 'class-validator';

export class UpdatePersonalityDto {
  @ApiPropertyOptional({ example: 'You are a helpful customer support agent.' })
  @IsOptional()
  @IsString()
  systemPrompt?: string;

  @ApiPropertyOptional({ example: 'Xin chào! Tôi có thể giúp gì cho bạn?' })
  @IsOptional()
  @IsString()
  greetingMessage?: string;

  @ApiPropertyOptional({ example: ['Giá sản phẩm?', 'Cách đặt hàng?'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  suggestedQuestions?: string[];

  @ApiPropertyOptional({ example: 'Xin lỗi, tôi không hiểu câu hỏi.' })
  @IsOptional()
  @IsString()
  fallbackMessage?: string;

  @ApiPropertyOptional({
    example: { tone: 'friendly', language: 'vi', restrictions: [] },
  })
  @IsOptional()
  personality?: Record<string, any>;
}
