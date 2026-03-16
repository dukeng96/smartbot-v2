import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ChatProxyService } from './chat-proxy.service';
import { BotsService } from '../bots/bots.service';
import { ConversationsService } from '../conversations/conversations.service';
import { MessagesService } from '../conversations/messages.service';
import { CreditsService } from '../billing/credits.service';

describe('ChatProxyService', () => {
  let service: ChatProxyService;
  let mockBotsService: Record<string, jest.Mock>;
  let mockConversationsService: Record<string, jest.Mock>;
  let mockMessagesService: Record<string, jest.Mock>;
  let mockCreditsService: Record<string, jest.Mock>;

  const botId = 'bot-1';
  const mockBot = {
    id: botId,
    tenantId: 'tenant-1',
    name: 'Test Bot',
    avatarUrl: null,
    greetingMessage: 'Hello!',
    suggestedQuestions: ['Q1'],
    widgetConfig: {},
    systemPrompt: 'You are helpful',
    topK: 5,
    memoryTurns: 10,
    status: 'active',
  };

  const mockConv = {
    id: 'conv-1',
    botId,
    tenantId: 'tenant-1',
    status: 'active',
  };

  beforeEach(async () => {
    mockBotsService = {
      findActive: jest.fn().mockResolvedValue(mockBot),
      getKnowledgeBaseIds: jest.fn().mockResolvedValue(['kb-1']),
    };

    mockConversationsService = {
      getOrCreate: jest.fn().mockResolvedValue(mockConv),
      updateStats: jest.fn().mockResolvedValue(undefined),
    };

    mockMessagesService = {
      create: jest.fn().mockResolvedValue({ id: 'msg-1' }),
      getRecent: jest.fn().mockResolvedValue([]),
    };

    mockCreditsService = {
      checkQuota: jest.fn().mockResolvedValue(undefined),
      increment: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatProxyService,
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('http://localhost:8000') } },
        { provide: BotsService, useValue: mockBotsService },
        { provide: ConversationsService, useValue: mockConversationsService },
        { provide: MessagesService, useValue: mockMessagesService },
        { provide: CreditsService, useValue: mockCreditsService },
      ],
    }).compile();

    service = module.get<ChatProxyService>(ChatProxyService);
  });

  describe('getBotConfig', () => {
    it('should return public bot config', async () => {
      const result = await service.getBotConfig(botId);

      expect(result.id).toBe(botId);
      expect(result.name).toBe('Test Bot');
      expect(result.greetingMessage).toBe('Hello!');
      expect(mockBotsService.findActive).toHaveBeenCalledWith(botId);
    });
  });

  describe('getConversationHistory', () => {
    it('should return recent messages', async () => {
      mockMessagesService.getRecent.mockResolvedValue([
        { role: 'user', content: 'hi' },
      ]);

      const result = await service.getConversationHistory(botId, 'conv-1');

      expect(result).toHaveLength(1);
      expect(mockMessagesService.getRecent).toHaveBeenCalledWith('conv-1', 50);
    });
  });

  describe('processChat', () => {
    it('should yield conversation, delta, and done events', async () => {
      const events: Array<{ event: string; data: string }> = [];

      for await (const event of service.processChat({
        botId,
        message: 'Hello',
      })) {
        events.push(event);
      }

      // First event: conversation ID
      expect(events[0].event).toBe('conversation');
      const convData = JSON.parse(events[0].data);
      expect(convData.conversationId).toBe('conv-1');

      // Middle events: delta chunks
      const deltas = events.filter((e) => e.event === 'delta');
      expect(deltas.length).toBeGreaterThan(0);

      // Last event: done
      const done = events[events.length - 1];
      expect(done.event).toBe('done');
      const doneData = JSON.parse(done.data);
      expect(doneData.conversationId).toBe('conv-1');
      expect(doneData.creditsUsed).toBe(1);
    });

    it('should save user and assistant messages', async () => {
      const events: Array<{ event: string; data: string }> = [];
      for await (const event of service.processChat({
        botId,
        message: 'Hello',
      })) {
        events.push(event);
      }

      // User message
      expect(mockMessagesService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'user',
          content: 'Hello',
        }),
      );

      // Assistant message
      expect(mockMessagesService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'assistant',
          creditsUsed: 1,
          modelUsed: 'mock-gpt-4',
        }),
      );
    });

    it('should check quota and increment credits', async () => {
      const events: Array<{ event: string; data: string }> = [];
      for await (const event of service.processChat({
        botId,
        message: 'test',
      })) {
        events.push(event);
      }

      expect(mockCreditsService.checkQuota).toHaveBeenCalledWith('tenant-1');
      expect(mockCreditsService.increment).toHaveBeenCalledWith('tenant-1', 1);
    });

    it('should update conversation stats after processing', async () => {
      const events: Array<{ event: string; data: string }> = [];
      for await (const event of service.processChat({
        botId,
        message: 'test',
      })) {
        events.push(event);
      }

      expect(mockConversationsService.updateStats).toHaveBeenCalledWith('conv-1', expect.any(String));
    });
  });
});
