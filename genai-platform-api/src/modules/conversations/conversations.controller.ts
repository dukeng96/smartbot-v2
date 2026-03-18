import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { ConversationsService } from './conversations.service';
import { ListConversationsDto } from './dto/list-conversations.dto';
import { RateConversationDto } from './dto/rate-conversation.dto';
import { MessageFeedbackDto } from './dto/message-feedback.dto';
import { SearchMessagesDto } from './dto/search-messages.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';

@ApiTags('Conversations')
@ApiBearerAuth()
@Controller('api/v1')
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Get('conversations')
  @ApiOperation({ summary: 'List all conversations for tenant' })
  findAll(
    @CurrentTenant() tenantId: string,
    @Query() query: ListConversationsDto,
  ) {
    return this.conversationsService.findAll(tenantId, query);
  }

  @Get('bots/:botId/conversations')
  @ApiOperation({ summary: 'List conversations for bot' })
  findAllByBot(
    @CurrentTenant() tenantId: string,
    @Param('botId', ParseUUIDPipe) botId: string,
    @Query() query: ListConversationsDto,
  ) {
    return this.conversationsService.findAllByBot(tenantId, botId, query);
  }

  @Get('conversations/:convId')
  @ApiOperation({ summary: 'Get conversation detail' })
  findOne(
    @CurrentTenant() tenantId: string,
    @Param('convId', ParseUUIDPipe) convId: string,
  ) {
    return this.conversationsService.findOne(tenantId, convId);
  }

  @Get('conversations/:convId/messages')
  @ApiOperation({ summary: 'List messages in conversation' })
  getMessages(
    @CurrentTenant() tenantId: string,
    @Param('convId', ParseUUIDPipe) convId: string,
    @Query() query: PaginationDto,
  ) {
    return this.conversationsService.getMessages(tenantId, convId, query);
  }

  @Delete('conversations/:convId')
  @ApiOperation({ summary: 'Archive conversation' })
  archive(
    @CurrentTenant() tenantId: string,
    @Param('convId', ParseUUIDPipe) convId: string,
  ) {
    return this.conversationsService.archive(tenantId, convId);
  }

  @Get('bots/:botId/messages/search')
  @ApiOperation({ summary: 'Search messages across bot conversations' })
  @ApiQuery({ name: 'q', required: true })
  searchMessages(
    @CurrentTenant() tenantId: string,
    @Param('botId', ParseUUIDPipe) botId: string,
    @Query() query: SearchMessagesDto,
  ) {
    return this.conversationsService.searchMessages(
      tenantId, botId, query.q, query.page, query.limit,
    );
  }

  @Post('conversations/:convId/rating')
  @ApiOperation({ summary: 'Rate conversation' })
  rate(
    @CurrentTenant() tenantId: string,
    @Param('convId', ParseUUIDPipe) convId: string,
    @Body() dto: RateConversationDto,
  ) {
    return this.conversationsService.rate(tenantId, convId, dto);
  }

  @Post('messages/:msgId/feedback')
  @ApiOperation({ summary: 'Per-message feedback (thumbs up/down)' })
  messageFeedback(
    @CurrentTenant() tenantId: string,
    @Param('msgId', ParseUUIDPipe) msgId: string,
    @Body() dto: MessageFeedbackDto,
  ) {
    return this.conversationsService.messageFeedback(tenantId, msgId, dto.feedback);
  }
}
