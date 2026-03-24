import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateBotDto } from './dto/create-bot.dto';
import { UpdateBotDto } from './dto/update-bot.dto';
import { UpdatePersonalityDto } from './dto/update-personality.dto';
import { UpdateWidgetDto } from './dto/update-widget.dto';
import { AttachKnowledgeBaseDto } from './dto/attach-knowledge-base.dto';
import { PaginatedResult } from '../../common/dto/pagination.dto';
import { ListBotsQueryDto } from './dto/list-bots-query.dto';
import { generateApiKey, hashApiKey, getApiKeyPrefix } from '../../common/utils/crypto';

@Injectable()
export class BotsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateBotDto) {
    return this.prisma.bot.create({
      data: {
        tenantId,
        name: dto.name,
        description: dto.description,
        status: 'draft',
      },
    });
  }

  async findAll(tenantId: string, query: ListBotsQueryDto) {
    const where: any = { tenantId, deletedAt: null };
    if (query.status) where.status = query.status;

    const [data, total] = await Promise.all([
      this.prisma.bot.findMany({
        where,
        orderBy: { [query.sort || 'createdAt']: query.order || 'desc' },
        skip: query.skip,
        take: query.limit,
        include: {
          _count: { select: { knowledgeBases: true, conversations: true, channels: true } },
        },
      }),
      this.prisma.bot.count({ where }),
    ]);

    return new PaginatedResult(data, total, query.page, query.limit);
  }

  async findOne(tenantId: string, botId: string) {
    const bot = await this.prisma.bot.findFirst({
      where: { id: botId, tenantId, deletedAt: null },
      include: {
        knowledgeBases: {
          include: {
            knowledgeBase: {
              select: { id: true, name: true, totalDocuments: true, totalChars: true, status: true },
            },
          },
          orderBy: { priority: 'asc' },
        },
        _count: { select: { conversations: true, channels: true } },
      },
    });
    if (!bot) throw new NotFoundException('Bot not found');
    return bot;
  }

  async findActive(botId: string) {
    const bot = await this.prisma.bot.findFirst({
      where: { id: botId, status: 'active', deletedAt: null },
    });
    if (!bot) throw new NotFoundException('Bot not found or inactive');
    return bot;
  }

  async update(tenantId: string, botId: string, dto: UpdateBotDto) {
    await this.ensureBotExists(tenantId, botId);

    return this.prisma.bot.update({
      where: { id: botId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.avatarUrl !== undefined && { avatarUrl: dto.avatarUrl }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.topK !== undefined && { topK: dto.topK }),
        ...(dto.memoryTurns !== undefined && { memoryTurns: dto.memoryTurns }),
      },
    });
  }

  async softDelete(tenantId: string, botId: string) {
    await this.ensureBotExists(tenantId, botId);
    return this.prisma.bot.update({
      where: { id: botId },
      data: { deletedAt: new Date() },
    });
  }

  async duplicate(tenantId: string, botId: string) {
    const original = await this.findOne(tenantId, botId);

    const clone = await this.prisma.bot.create({
      data: {
        tenantId,
        name: `${original.name} (copy)`,
        description: original.description,
        avatarUrl: original.avatarUrl,
        status: 'draft',
        systemPrompt: original.systemPrompt,
        greetingMessage: original.greetingMessage,
        suggestedQuestions: original.suggestedQuestions as any,
        personality: original.personality as any,
        fallbackMessage: original.fallbackMessage,
        topK: original.topK,
        memoryTurns: original.memoryTurns,
        widgetConfig: original.widgetConfig as any,
      },
    });

    // Copy KB links
    if (original.knowledgeBases.length > 0) {
      await this.prisma.botKnowledgeBase.createMany({
        data: original.knowledgeBases.map((bkb: any) => ({
          botId: clone.id,
          knowledgeBaseId: bkb.knowledgeBaseId,
          priority: bkb.priority,
        })),
      });
    }

    return clone;
  }

  async getPersonality(tenantId: string, botId: string) {
    const bot = await this.ensureBotExists(tenantId, botId);
    return {
      systemPrompt: bot.systemPrompt,
      greetingMessage: bot.greetingMessage,
      suggestedQuestions: bot.suggestedQuestions,
      fallbackMessage: bot.fallbackMessage,
      personality: bot.personality,
    };
  }

  async updatePersonality(tenantId: string, botId: string, dto: UpdatePersonalityDto) {
    await this.ensureBotExists(tenantId, botId);

    return this.prisma.bot.update({
      where: { id: botId },
      data: {
        ...(dto.systemPrompt !== undefined && { systemPrompt: dto.systemPrompt }),
        ...(dto.greetingMessage !== undefined && { greetingMessage: dto.greetingMessage }),
        ...(dto.suggestedQuestions !== undefined && { suggestedQuestions: dto.suggestedQuestions }),
        ...(dto.fallbackMessage !== undefined && { fallbackMessage: dto.fallbackMessage }),
        ...(dto.personality !== undefined && { personality: dto.personality }),
      },
      select: {
        id: true,
        systemPrompt: true,
        greetingMessage: true,
        suggestedQuestions: true,
        fallbackMessage: true,
        personality: true,
      },
    });
  }

  async updateWidget(tenantId: string, botId: string, dto: UpdateWidgetDto) {
    await this.ensureBotExists(tenantId, botId);

    const bot = await this.prisma.bot.findUnique({ where: { id: botId } });
    const currentConfig = ((bot?.widgetConfig ?? {}) as Record<string, any>);

    return this.prisma.bot.update({
      where: { id: botId },
      data: {
        widgetConfig: {
          ...currentConfig,
          ...(dto.theme !== undefined && { theme: dto.theme }),
          ...(dto.primaryColor !== undefined && { primaryColor: dto.primaryColor }),
          ...(dto.position !== undefined && { position: dto.position }),
          ...(dto.bubbleIcon !== undefined && { bubbleIcon: dto.bubbleIcon }),
          ...(dto.showPoweredBy !== undefined && { showPoweredBy: dto.showPoweredBy }),
          ...(dto.customCss !== undefined && { customCss: dto.customCss }),
          ...(dto.headerText !== undefined && { headerText: dto.headerText }),
          ...(dto.displayName !== undefined && { displayName: dto.displayName }),
          ...(dto.logoUrl !== undefined && { logoUrl: dto.logoUrl }),
          ...(dto.fontColor !== undefined && { fontColor: dto.fontColor }),
          ...(dto.backgroundColor !== undefined && { backgroundColor: dto.backgroundColor }),
          ...(dto.userMessageColor !== undefined && { userMessageColor: dto.userMessageColor }),
          ...(dto.botMessageColor !== undefined && { botMessageColor: dto.botMessageColor }),
          ...(dto.fontFamily !== undefined && { fontFamily: dto.fontFamily }),
          ...(dto.fontSize !== undefined && { fontSize: dto.fontSize }),
        },
      },
      select: { id: true, widgetConfig: true },
    });
  }

  async getWidgetPreview(tenantId: string, botId: string) {
    const bot = await this.ensureBotExists(tenantId, botId);
    const config = (bot.widgetConfig as Record<string, any>) || {};

    const escapedName = this.escapeHtml(bot.name);
    const escapedConfig = JSON.stringify(config)
      .replace(/'/g, '&#39;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    return {
      html: `<!-- Widget Preview for Bot: ${escapedName} -->
<div id="genai-widget" data-bot-id="${bot.id}" data-config='${escapedConfig}'></div>
<script src="/widget/smartbot-widget-loader.iife.js"></script>`,
    };
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  async generateApiKey(tenantId: string, botId: string) {
    await this.ensureBotExists(tenantId, botId);

    const rawKey = generateApiKey();
    const hash = hashApiKey(rawKey);
    const prefix = getApiKeyPrefix(rawKey);

    await this.prisma.bot.update({
      where: { id: botId },
      data: { apiKeyHash: hash, apiKeyPrefix: prefix },
    });

    return { apiKey: rawKey, prefix };
  }

  async revokeApiKey(tenantId: string, botId: string) {
    await this.ensureBotExists(tenantId, botId);

    await this.prisma.bot.update({
      where: { id: botId },
      data: { apiKeyHash: null, apiKeyPrefix: null },
    });

    return { message: 'API key revoked' };
  }

  async getEmbedCode(tenantId: string, botId: string) {
    await this.ensureBotExists(tenantId, botId);

    const appUrl = process.env.APP_URL || 'https://platform.vn';
    const frontendUrl = process.env.FRONTEND_URL || appUrl;

    return {
      iframe: `<iframe src="${appUrl}/widget/iframe.html?botId=${botId}" width="400" height="600" frameborder="0"></iframe>`,
      bubble: `<script src="${appUrl}/widget/smartbot-widget-loader.iife.js" data-bot-id="${botId}"></script>`,
      directLink: `${frontendUrl}/chat/${botId}`,
    };
  }

  async attachKnowledgeBase(tenantId: string, botId: string, dto: AttachKnowledgeBaseDto) {
    await this.ensureBotExists(tenantId, botId);

    // Verify KB belongs to tenant
    const kb = await this.prisma.knowledgeBase.findFirst({
      where: { id: dto.knowledgeBaseId, tenantId, deletedAt: null },
    });
    if (!kb) throw new NotFoundException('Knowledge base not found');

    // Check not already attached
    const existing = await this.prisma.botKnowledgeBase.findUnique({
      where: { botId_knowledgeBaseId: { botId, knowledgeBaseId: dto.knowledgeBaseId } },
    });
    if (existing) throw new ConflictException('Knowledge base already attached');

    return this.prisma.botKnowledgeBase.create({
      data: {
        botId,
        knowledgeBaseId: dto.knowledgeBaseId,
        priority: dto.priority || 0,
      },
      include: {
        knowledgeBase: {
          select: { id: true, name: true, totalDocuments: true },
        },
      },
    });
  }

  async detachKnowledgeBase(tenantId: string, botId: string, kbId: string) {
    await this.ensureBotExists(tenantId, botId);

    await this.prisma.botKnowledgeBase.delete({
      where: { botId_knowledgeBaseId: { botId, knowledgeBaseId: kbId } },
    });

    return { message: 'Knowledge base detached' };
  }

  async listKnowledgeBases(tenantId: string, botId: string) {
    await this.ensureBotExists(tenantId, botId);

    return this.prisma.botKnowledgeBase.findMany({
      where: { botId },
      include: {
        knowledgeBase: {
          select: { id: true, name: true, description: true, totalDocuments: true, totalChars: true, status: true },
        },
      },
      orderBy: { priority: 'asc' },
    });
  }

  async getKnowledgeBaseIds(botId: string): Promise<string[]> {
    const links = await this.prisma.botKnowledgeBase.findMany({
      where: { botId },
      select: { knowledgeBaseId: true },
    });
    return links.map((l: any) => l.knowledgeBaseId);
  }

  private async ensureBotExists(tenantId: string, botId: string) {
    const bot = await this.prisma.bot.findFirst({
      where: { id: botId, tenantId, deletedAt: null },
    });
    if (!bot) throw new NotFoundException('Bot not found');
    return bot;
  }
}
