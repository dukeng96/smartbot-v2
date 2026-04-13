import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { QuotaGuard } from '../../common/guards/quota.guard';
import { QuotaType } from '../../common/decorators/quota-type.decorator';
import { BotsService } from './bots.service';
import { FlowsService } from '../flows/flows.service';
import { CreateBotDto } from './dto/create-bot.dto';
import { UpdateBotDto } from './dto/update-bot.dto';
import { UpdatePersonalityDto } from './dto/update-personality.dto';
import { UpdateWidgetDto } from './dto/update-widget.dto';
import { AttachKnowledgeBaseDto } from './dto/attach-knowledge-base.dto';
import { ListBotsQueryDto } from './dto/list-bots-query.dto';
import { SwapBotFlowDto } from './dto/swap-bot-flow.dto';

@ApiTags('Bots')
@ApiBearerAuth()
@Controller('api/v1/bots')
export class BotsController {
  constructor(
    private readonly botsService: BotsService,
    private readonly flowsService: FlowsService,
  ) {}

  @Post()
  @UseGuards(QuotaGuard)
  @QuotaType('bot_create')
  @ApiOperation({ summary: 'Create a new bot' })
  create(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: { userId: string },
    @Body() dto: CreateBotDto,
  ) {
    return this.botsService.create(tenantId, user.userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List bots' })
  findAll(@CurrentTenant() tenantId: string, @Query() query: ListBotsQueryDto) {
    return this.botsService.findAll(tenantId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get bot detail' })
  findOne(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.botsService.findOne(tenantId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update bot' })
  update(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBotDto,
  ) {
    return this.botsService.update(tenantId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete bot' })
  remove(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.botsService.softDelete(tenantId, id);
  }

  @Post(':id/duplicate')
  @UseGuards(QuotaGuard)
  @QuotaType('bot_create')
  @ApiOperation({ summary: 'Duplicate bot' })
  duplicate(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: { userId: string },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.botsService.duplicate(tenantId, user.userId, id);
  }

  @Patch(':id/flow')
  @ApiOperation({ summary: 'Swap the flow attached to a bot' })
  swapFlow(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SwapBotFlowDto,
  ) {
    return this.flowsService.swapBotFlow(tenantId, id, dto.flowId);
  }

  @Get(':id/personality')
  @ApiOperation({ summary: 'Get personality config' })
  getPersonality(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.botsService.getPersonality(tenantId, id);
  }

  @Patch(':id/personality')
  @ApiOperation({ summary: 'Update personality config' })
  updatePersonality(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePersonalityDto,
  ) {
    return this.botsService.updatePersonality(tenantId, id, dto);
  }

  @Patch(':id/widget')
  @ApiOperation({ summary: 'Update widget config' })
  updateWidget(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateWidgetDto,
  ) {
    return this.botsService.updateWidget(tenantId, id, dto);
  }

  @Get(':id/widget/preview')
  @ApiOperation({ summary: 'Preview widget HTML' })
  getWidgetPreview(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.botsService.getWidgetPreview(tenantId, id);
  }

  @Post(':id/api-key')
  @ApiOperation({ summary: 'Generate API key (returned once)' })
  generateApiKey(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.botsService.generateApiKey(tenantId, id);
  }

  @Delete(':id/api-key')
  @ApiOperation({ summary: 'Revoke API key' })
  revokeApiKey(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.botsService.revokeApiKey(tenantId, id);
  }

  @Get(':id/embed-code')
  @ApiOperation({ summary: 'Get embed code snippets' })
  getEmbedCode(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.botsService.getEmbedCode(tenantId, id);
  }

  @Post(':id/knowledge-bases')
  @ApiOperation({ summary: 'Attach knowledge base to bot' })
  attachKnowledgeBase(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AttachKnowledgeBaseDto,
  ) {
    return this.botsService.attachKnowledgeBase(tenantId, id, dto);
  }

  @Delete(':id/knowledge-bases/:kbId')
  @ApiOperation({ summary: 'Detach knowledge base' })
  detachKnowledgeBase(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('kbId', ParseUUIDPipe) kbId: string,
  ) {
    return this.botsService.detachKnowledgeBase(tenantId, id, kbId);
  }

  @Get(':id/knowledge-bases')
  @ApiOperation({ summary: 'List attached knowledge bases' })
  listKnowledgeBases(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.botsService.listKnowledgeBases(tenantId, id);
  }
}
