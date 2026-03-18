import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ConversationsService } from './conversations.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { createPrismaMock } from '../../common/testing/prisma-mock.helper';

describe('ConversationsService', () => {
  let service: ConversationsService;
  let prisma: ReturnType<typeof createPrismaMock>;

  const tenantId = 'tenant-1';
  const botId = 'bot-1';
  const convId = 'conv-1';

  const mockConv = {
    id: convId,
    botId,
    tenantId,
    endUserId: 'user-1',
    endUserName: 'Test User',
    channel: 'web_widget',
    status: 'active',
    messageCount: 10,
    lastMessageAt: new Date(),
    rating: null,
    feedbackText: null,
    createdAt: new Date(),
    bot: { id: botId, name: 'Test Bot', avatarUrl: null },
  };

  const mockMsg = {
    id: 'msg-1',
    conversationId: convId,
    role: 'user',
    content: 'Hello',
    createdAt: new Date(),
  };

  beforeEach(async () => {
    prisma = createPrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConversationsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ConversationsService>(ConversationsService);
  });

  describe('findAllByBot', () => {
    it('should return paginated conversations', async () => {
      prisma.conversation.findMany.mockResolvedValue([mockConv]);
      prisma.conversation.count.mockResolvedValue(1);

      const result = await service.findAllByBot(tenantId, botId, {
        page: 1,
        limit: 20,
        sort: 'createdAt',
        order: 'desc' as const,
        get skip() { return 0; },
      });

      expect(result.items).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it('should filter by channel and status', async () => {
      prisma.conversation.findMany.mockResolvedValue([]);
      prisma.conversation.count.mockResolvedValue(0);

      await service.findAllByBot(tenantId, botId, {
        page: 1,
        limit: 20,
        sort: 'createdAt',
        order: 'desc' as const,
        channel: 'facebook',
        status: 'archived',
        get skip() { return 0; },
      });

      expect(prisma.conversation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            channel: 'facebook',
            status: 'archived',
          }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return conversation with bot info', async () => {
      prisma.conversation.findFirst.mockResolvedValue(mockConv);

      const result = await service.findOne(tenantId, convId);

      expect(result.id).toBe(convId);
      expect(result.bot.name).toBe('Test Bot');
    });

    it('should throw NotFoundException if not found', async () => {
      prisma.conversation.findFirst.mockResolvedValue(null);

      await expect(service.findOne(tenantId, 'bad-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getMessages', () => {
    it('should return paginated messages', async () => {
      // Mock ensureConvExists
      prisma.conversation.findFirst.mockResolvedValue(mockConv);
      prisma.message.findMany.mockResolvedValue([mockMsg]);
      prisma.message.count.mockResolvedValue(1);

      const result = await service.getMessages(tenantId, convId, {
        page: 1,
        limit: 50,
        sort: 'createdAt',
        order: 'asc' as const,
        get skip() { return 0; },
      });

      expect(result.items).toHaveLength(1);
    });

    it('should throw NotFoundException for non-existent conversation', async () => {
      prisma.conversation.findFirst.mockResolvedValue(null);

      await expect(
        service.getMessages(tenantId, 'bad-conv', {
          page: 1,
          limit: 50,
          sort: 'createdAt',
          order: 'asc' as const,
          get skip() { return 0; },
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('archive', () => {
    it('should archive conversation', async () => {
      prisma.conversation.findFirst.mockResolvedValue(mockConv);
      prisma.conversation.update.mockResolvedValue({});

      const result = await service.archive(tenantId, convId);

      expect(result.message).toBe('Conversation archived');
      expect(prisma.conversation.update).toHaveBeenCalledWith({
        where: { id: convId },
        data: { status: 'archived' },
      });
    });
  });

  describe('rate', () => {
    it('should save rating', async () => {
      prisma.conversation.findFirst.mockResolvedValue(mockConv);
      prisma.conversation.update.mockResolvedValue({});

      const result = await service.rate(tenantId, convId, {
        rating: 5,
        feedbackText: 'Great!',
      });

      expect(result.message).toBe('Rating saved');
    });
  });

  describe('messageFeedback', () => {
    it('should save feedback on message', async () => {
      prisma.message.findFirst.mockResolvedValue(mockMsg);
      prisma.message.update.mockResolvedValue({});

      const result = await service.messageFeedback(tenantId, 'msg-1', 'thumbs_up');

      expect(result.message).toBe('Feedback saved');
    });

    it('should throw NotFoundException for non-existent message', async () => {
      prisma.message.findFirst.mockResolvedValue(null);

      await expect(
        service.messageFeedback(tenantId, 'bad-msg', 'thumbs_up'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('searchMessages', () => {
    it('should search messages using ILIKE', async () => {
      prisma.message.findMany.mockResolvedValue([mockMsg]);
      prisma.message.count.mockResolvedValue(1);

      const result = await service.searchMessages(tenantId, botId, 'hello', 1, 20);

      expect(result.items).toHaveLength(1);
      expect(prisma.message.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            content: { contains: 'hello', mode: 'insensitive' },
          }),
        }),
      );
    });
  });

  describe('getOrCreate', () => {
    it('should return existing conversation if ID matches', async () => {
      prisma.conversation.findFirst.mockResolvedValue(mockConv);

      const result = await service.getOrCreate(botId, tenantId, convId);

      expect(result.id).toBe(convId);
      expect(prisma.conversation.create).not.toHaveBeenCalled();
    });

    it('should create new conversation when no ID provided', async () => {
      prisma.conversation.create.mockResolvedValue(mockConv);

      const result = await service.getOrCreate(botId, tenantId);

      expect(prisma.conversation.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          botId,
          tenantId,
          channel: 'web_widget',
          status: 'active',
        }),
      });
    });

    it('should create new conversation when ID not found', async () => {
      prisma.conversation.findFirst.mockResolvedValue(null);
      prisma.conversation.create.mockResolvedValue(mockConv);

      await service.getOrCreate(botId, tenantId, 'non-existent');

      expect(prisma.conversation.create).toHaveBeenCalled();
    });
  });

  describe('updateStats', () => {
    it('should update message count and lastMessageAt', async () => {
      prisma.message.count.mockResolvedValue(15);
      prisma.conversation.update.mockResolvedValue({});

      await service.updateStats(convId);

      expect(prisma.conversation.update).toHaveBeenCalledWith({
        where: { id: convId },
        data: { messageCount: 15, lastMessageAt: expect.any(Date) },
      });
    });

    it('should update lastMessagePreview when content is provided', async () => {
      prisma.message.count.mockResolvedValue(5);
      prisma.conversation.update.mockResolvedValue({});

      await service.updateStats(convId, 'Hello, I need help with pricing');

      expect(prisma.conversation.update).toHaveBeenCalledWith({
        where: { id: convId },
        data: {
          messageCount: 5,
          lastMessageAt: expect.any(Date),
          lastMessagePreview: 'Hello, I need help with pricing',
        },
      });
    });

    it('should truncate lastMessagePreview to 200 characters', async () => {
      prisma.message.count.mockResolvedValue(3);
      prisma.conversation.update.mockResolvedValue({});
      const longContent = 'A'.repeat(300);

      await service.updateStats(convId, longContent);

      expect(prisma.conversation.update).toHaveBeenCalledWith({
        where: { id: convId },
        data: {
          messageCount: 3,
          lastMessageAt: expect.any(Date),
          lastMessagePreview: 'A'.repeat(200),
        },
      });
    });
  });
});
