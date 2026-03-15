import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString } from 'class-validator';

export class MessageFeedbackDto {
  @ApiProperty({ enum: ['thumbs_up', 'thumbs_down'] })
  @IsString()
  @IsIn(['thumbs_up', 'thumbs_down'])
  feedback: string;
}
