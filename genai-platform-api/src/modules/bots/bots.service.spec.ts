import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { BotsService } from './bots.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { createPrismaMock } from '../../common/testing/prisma-mock.helper';

jest.mock('../../common/utils/crypto', () => ({
  generateApiKey: jest.fn().mockReturnValue('sk_mock_api_key_1234567890abcdef'),
  hashApiKey: jest.fn().mockReturnValue('hashed-api-key'),
  getApiKeyPrefix: jest.fn().mockReturnValue('sk_mock_'),
}));

describe('BotsService', () => {
  let service: BotsService;
  let prisma: ReturnType<typeof createPrismaMock>;

  const tenantId = 'tenant-1';
  const botId = 'bot-1';
  const mockBot = {
    id: botId,
    tenantId,
    name: 'Test Bot',
    description: 'A test bot',
    status: 'draft',
    avatarUrl: null,
    systemPrompt: 'You are a helpful assistant',
    greetingMessage: 'Hello!',
    suggestedQuestions: ['Q1', 'Q2'],
    fallbackMessage: 'Sorry, I cannot help with that',
    personality: { tone: 'friendly' },
    topK: 5,
    memoryTurns: 10,
    widgetConfig: { theme: 'light' },
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    knowledgeBases: [],
    _count: { conversations: 5, channels: 1 },
  };

  beforeEach(async () => {
    prisma = createPrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BotsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<BotsService>(BotsService);
  });

  describe('create', () => {
    it('should create a bot with draft status', async () => {
      prisma.bot.create.mockResolvedValue(mockBot);

      const result = await service.create(tenantId, {
        name: 'Test Bot',
        description: 'A test bot',
      });

      expect(result.name).toBe('Test Bot');
      expect(prisma.bot.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId,
          name: 'Test Bot',
          status: 'draft',
        }),
      });
    });
  });

  describe('findAll', () => {
    it('should return paginated bots', async () => {
      prisma.bot.findMany.mockResolvedValue([mockBot]);
      prisma.bot.count.mockResolvedValue(1);

      const result = await service.findAll(tenantId, {
        page: 1,
        limit: 20,
        sort: 'createdAt',
        order: 'desc' as const,
        get skip() { return 0; },
      });

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it('should filter by status', async () => {
      prisma.bot.findMany.mockResolvedValue([]);
      prisma.bot.count.mockResolvedValue(0);

      await service.findAll(tenantId, {
        page: 1,
        limit: 20,
        sort: 'createdAt',
        order: 'desc' as const,
        status: 'active',
        get skip() { return 0; },
      });

      expect(prisma.bot.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'active' }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return bot with KB and counts', async () => {
      prisma.bot.findFirst.mockResolvedValue(mockBot);

      const result = await service.findOne(tenantId, botId);

      expect(result.name).toBe('Test Bot');
    });

    it('should throw NotFoundException if bot not found', async () => {
      prisma.bot.findFirst.mockResolvedValue(null);

      await expect(service.findOne(tenantId, 'bad-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findActive', () => {
    it('should return active bot', async () => {
      prisma.bot.findFirst.mockResolvedValue({ ...mockBot, status: 'active' });

      const result = await service.findActive(botId);

      expect(result.status).toBe('active');
    });

    it('should throw NotFoundException for inactive bot', async () => {
      prisma.bot.findFirst.mockResolvedValue(null);

      await expect(service.findActive('bad-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update bot fields', async () => {
      prisma.bot.findFirst.mockResolvedValue(mockBot);
      prisma.bot.update.mockResolvedValue({ ...mockBot, name: 'Updated Bot' });

      const result = await service.update(tenantId, botId, { name: 'Updated Bot' });

      expect(result.name).toBe('Updated Bot');
    });

    it('should throw NotFoundException for non-existent bot', async () => {
      prisma.bot.findFirst.mockResolvedValue(null);

      await expect(
        service.update(tenantId, 'bad-id', { name: 'X' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('softDelete', () => {
    it('should set deletedAt on bot', async () => {
      prisma.bot.findFirst.mockResolvedValue(mockBot);
      prisma.bot.update.mockResolvedValue({ ...mockBot, deletedAt: new Date() });

      const result = await service.softDelete(tenantId, botId);

      expect(result.deletedAt).toBeDefined();
      expect(prisma.bot.update).toHaveBeenCalledWith({
        where: { id: botId },
        data: { deletedAt: expect.any(Date) },
      });
    });
  });

  describe('duplicate', () => {
    it('should create a copy of the bot', async () => {
      prisma.bot.findFirst.mockResolvedValue(mockBot);
      const clonedBot = { ...mockBot, id: 'bot-2', name: 'Test Bot (copy)' };
      prisma.bot.create.mockResolvedValue(clonedBot);

      const result = await service.duplicate(tenantId, botId);

      expect(result.name).toBe('Test Bot (copy)');
      expect(prisma.bot.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ name: 'Test Bot (copy)' }),
      });
    });
  });

  describe('getPersonality', () => {
    it('should return personality fields', async () => {
      prisma.bot.findFirst.mockResolvedValue(mockBot);

      const result = await service.getPersonality(tenantId, botId);

      expect(result.systemPrompt).toBe('You are a helpful assistant');
      expect(result.greetingMessage).toBe('Hello!');
    });
  });

  describe('updatePersonality', () => {
    it('should update personality fields', async () => {
      prisma.bot.findFirst.mockResolvedValue(mockBot);
      prisma.bot.update.mockResolvedValue({
        id: botId,
        systemPrompt: 'New prompt',
        greetingMessage: 'Hello!',
        suggestedQuestions: [],
        fallbackMessage: null,
        personality: null,
      });

      const result = await service.updatePersonality(tenantId, botId, {
        systemPrompt: 'New prompt',
      });

      expect(result.systemPrompt).toBe('New prompt');
    });
  });

  describe('generateApiKey', () => {
    it('should generate and store a hashed API key', async () => {
      prisma.bot.findFirst.mockResolvedValue(mockBot);
      prisma.bot.update.mockResolvedValue({});

      const result = await service.generateApiKey(tenantId, botId);

      expect(result.apiKey).toContain('sk_');
      expect(result.prefix).toBe('sk_mock_');
      expect(prisma.bot.update).toHaveBeenCalledWith({
        where: { id: botId },
        data: { apiKeyHash: 'hashed-api-key', apiKeyPrefix: 'sk_mock_' },
      });
    });
  });

  describe('revokeApiKey', () => {
    it('should set apiKey fields to null', async () => {
      prisma.bot.findFirst.mockResolvedValue(mockBot);
      prisma.bot.update.mockResolvedValue({});

      const result = await service.revokeApiKey(tenantId, botId);

      expect(result.message).toBe('API key revoked');
      expect(prisma.bot.update).toHaveBeenCalledWith({
        where: { id: botId },
        data: { apiKeyHash: null, apiKeyPrefix: null },
      });
    });
  });

  describe('attachKnowledgeBase', () => {
    it('should attach a knowledge base to bot', async () => {
      prisma.bot.findFirst.mockResolvedValue(mockBot);
      prisma.knowledgeBase.findFirst.mockResolvedValue({ id: 'kb-1', tenantId });
      prisma.botKnowledgeBase.findUnique.mockResolvedValue(null);
      prisma.botKnowledgeBase.create.mockResolvedValue({
        botId,
        knowledgeBaseId: 'kb-1',
        priority: 0,
        knowledgeBase: { id: 'kb-1', name: 'Test KB' },
      });

      const result = await service.attachKnowledgeBase(tenantId, botId, {
        knowledgeBaseId: 'kb-1',
      });

      expect(result.knowledgeBaseId).toBe('kb-1');
    });

    it('should throw ConflictException if already attached', async () => {
      prisma.bot.findFirst.mockResolvedValue(mockBot);
      prisma.knowledgeBase.findFirst.mockResolvedValue({ id: 'kb-1', tenantId });
      prisma.botKnowledgeBase.findUnique.mockResolvedValue({ botId, knowledgeBaseId: 'kb-1' });

      await expect(
        service.attachKnowledgeBase(tenantId, botId, { knowledgeBaseId: 'kb-1' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException if KB not found', async () => {
      prisma.bot.findFirst.mockResolvedValue(mockBot);
      prisma.knowledgeBase.findFirst.mockResolvedValue(null);

      await expect(
        service.attachKnowledgeBase(tenantId, botId, { knowledgeBaseId: 'bad-kb' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('detachKnowledgeBase', () => {
    it('should remove the bot-KB link', async () => {
      prisma.bot.findFirst.mockResolvedValue(mockBot);
      prisma.botKnowledgeBase.delete.mockResolvedValue({});

      const result = await service.detachKnowledgeBase(tenantId, botId, 'kb-1');

      expect(result.message).toBe('Knowledge base detached');
    });
  });

  describe('getEmbedCode', () => {
    it('should return embed code snippets', async () => {
      prisma.bot.findFirst.mockResolvedValue(mockBot);

      const result = await service.getEmbedCode(tenantId, botId);

      expect(result.iframe).toContain(botId);
      expect(result.bubble).toContain(botId);
      expect(result.directLink).toContain(botId);
    });
  });

  describe('getKnowledgeBaseIds', () => {
    it('should return array of KB IDs', async () => {
      prisma.botKnowledgeBase.findMany.mockResolvedValue([
        { knowledgeBaseId: 'kb-1' },
        { knowledgeBaseId: 'kb-2' },
      ]);

      const result = await service.getKnowledgeBaseIds(botId);

      expect(result).toEqual(['kb-1', 'kb-2']);
    });
  });
});
