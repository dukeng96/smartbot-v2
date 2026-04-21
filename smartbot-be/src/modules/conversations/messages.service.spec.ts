import { Test, TestingModule } from '@nestjs/testing';
import { MessagesService } from './messages.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { createPrismaMock } from '../../common/testing/prisma-mock.helper';

describe('MessagesService', () => {
  let service: MessagesService;
  let prisma: ReturnType<typeof createPrismaMock>;

  const mockMessage = {
    id: 'msg-1',
    conversationId: 'conv-1',
    botId: 'bot-1',
    tenantId: 'tenant-1',
    role: 'user',
    content: 'Hello',
    createdAt: new Date(),
  };

  beforeEach(async () => {
    prisma = createPrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessagesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<MessagesService>(MessagesService);
  });

  describe('create', () => {
    it('should create a message with all fields', async () => {
      prisma.message.create.mockResolvedValue(mockMessage);

      const result = await service.create({
        conversationId: 'conv-1',
        botId: 'bot-1',
        tenantId: 'tenant-1',
        role: 'user',
        content: 'Hello',
      });

      expect(result.id).toBe('msg-1');
      expect(prisma.message.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          conversationId: 'conv-1',
          role: 'user',
          content: 'Hello',
        }),
      });
    });

    it('should include optional fields when provided', async () => {
      prisma.message.create.mockResolvedValue({
        ...mockMessage,
        inputTokens: 10,
        outputTokens: 20,
        modelUsed: 'gpt-4',
      });

      await service.create({
        conversationId: 'conv-1',
        botId: 'bot-1',
        tenantId: 'tenant-1',
        role: 'assistant',
        content: 'Hi there',
        inputTokens: 10,
        outputTokens: 20,
        modelUsed: 'gpt-4',
      });

      expect(prisma.message.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          inputTokens: 10,
          outputTokens: 20,
          modelUsed: 'gpt-4',
        }),
      });
    });
  });

  describe('getRecent', () => {
    it('should return messages in chronological order', async () => {
      const msgs = [
        { role: 'assistant', content: 'Hi', createdAt: new Date('2024-01-02') },
        { role: 'user', content: 'Hello', createdAt: new Date('2024-01-01') },
      ];
      prisma.message.findMany.mockResolvedValue(msgs);

      const result = await service.getRecent('conv-1', 5);

      // Should reverse (desc → asc)
      expect(result[0].role).toBe('user');
      expect(result[1].role).toBe('assistant');
    });

    it('should take limit * 2 messages (user + assistant per turn)', async () => {
      prisma.message.findMany.mockResolvedValue([]);

      await service.getRecent('conv-1', 10);

      expect(prisma.message.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 20 }),
      );
    });
  });
});
