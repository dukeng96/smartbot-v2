import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { AnalyticsService } from './analytics.service';
import {
  AnalyticsQueryDto,
  TopQuestionsQueryDto,
} from './dto/analytics-query.dto';

@ApiTags('Analytics')
@ApiBearerAuth()
@Controller('api/v1/analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Dashboard KPI overview' })
  getOverview(@CurrentTenant() tenantId: string) {
    return this.analyticsService.getOverview(tenantId);
  }

  @Get('conversations')
  @ApiOperation({ summary: 'Conversations over time' })
  getConversations(
    @CurrentTenant() tenantId: string,
    @Query() query: AnalyticsQueryDto,
  ) {
    return this.analyticsService.getConversationsOverTime(
      tenantId,
      query.period,
      query.botId,
    );
  }

  @Get('messages')
  @ApiOperation({ summary: 'Message volume over time' })
  getMessages(
    @CurrentTenant() tenantId: string,
    @Query() query: AnalyticsQueryDto,
  ) {
    return this.analyticsService.getMessagesOverTime(
      tenantId,
      query.period,
      query.botId,
    );
  }

  @Get('credits')
  @ApiOperation({ summary: 'Credit usage over time' })
  getCredits(
    @CurrentTenant() tenantId: string,
    @Query() query: AnalyticsQueryDto,
  ) {
    return this.analyticsService.getCreditsOverTime(tenantId, query.period);
  }

  @Get('channels')
  @ApiOperation({ summary: 'Conversation breakdown by channel' })
  getChannels(
    @CurrentTenant() tenantId: string,
    @Query() query: AnalyticsQueryDto,
  ) {
    return this.analyticsService.getChannelBreakdown(tenantId, query.period);
  }

  @Get('bots/:botId/top-questions')
  @ApiOperation({ summary: 'Most asked questions for bot' })
  getTopQuestions(
    @CurrentTenant() tenantId: string,
    @Param('botId', ParseUUIDPipe) botId: string,
    @Query() query: TopQuestionsQueryDto,
  ) {
    return this.analyticsService.getTopQuestions(tenantId, botId, query.limit);
  }

  @Get('bots/:botId/satisfaction')
  @ApiOperation({ summary: 'Rating satisfaction distribution' })
  getSatisfaction(
    @CurrentTenant() tenantId: string,
    @Param('botId', ParseUUIDPipe) botId: string,
  ) {
    return this.analyticsService.getSatisfaction(tenantId, botId);
  }
}
