import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ChatProxyService } from './chat-proxy.service';
import { BotsService } from '../bots/bots.service';
import { ConversationsService } from '../conversations/conversations.service';
import { MessagesService } from '../conversations/messages.service';
import { FlowExecService } from '../flow-exec/flow-exec.service';

async function collect<T>(gen: AsyncIterable<T>): Promise<T[]> {
  const result: T[] = [];
  for await (const item of gen) result.push(item);
  return result;
}

describe('ChatProxyService', () => {
  let service: ChatProxyService;
  let botsService: Record<string, jest.Mock>;
  let conversationsService: Record<string, jest.Mock>;
  let messagesService: Record<string, jest.Mock>;
  let flowExecService: Record<string, jest.Mock>;

  const botId = 'bot-1';
  const mockBotWithFlow = {
    id: botId,
    tenantId: 'tenant-1',
    name: 'Test Bot',
    avatarUrl: null,
    greetingMessage: 'Hello!',
    suggestedQuestions: ['Q1'],
    widgetConfig: {},
    systemPrompt: 'You are helpful',
    memoryTurns: 10,
    status: 'active',
    flow: {
      id: 'flow-1',
      flowData: { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } },
    },
  };

  const mockConv = { id: 'conv-1', botId, tenantId: 'tenant-1' };

  beforeEach(async () => {
    botsService = {
      findActive: jest.fn().mockResolvedValue(mockBotWithFlow),
      findActiveWithFlow: jest.fn().mockResolvedValue(mockBotWithFlow),
    };

    conversationsService = {
      getOrCreate: jest.fn().mockResolvedValue(mockConv),
      updateStats: jest.fn().mockResolvedValue(undefined),
    };

    messagesService = {
      create: jest.fn().mockResolvedValue({ id: 'msg-1' }),
      getRecent: jest.fn().mockResolvedValue([]),
    };

    flowExecService = {
      runFlow: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatProxyService,
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('http://localhost:8000') } },
        { provide: BotsService, useValue: botsService },
        { provide: ConversationsService, useValue: conversationsService },
        { provide: MessagesService, useValue: messagesService },
        { provide: FlowExecService, useValue: flowExecService },
      ],
    }).compile();

    service = module.get<ChatProxyService>(ChatProxyService);
  });

  afterEach(() => jest.clearAllMocks());

  // --- getBotConfig ---

  describe('getBotConfig', () => {
    it('returns public bot config fields', async () => {
      const result = await service.getBotConfig(botId);
      expect(result.id).toBe(botId);
      expect(result.name).toBe('Test Bot');
      expect(result.greetingMessage).toBe('Hello!');
      expect(botsService.findActive).toHaveBeenCalledWith(botId);
    });
  });

  // --- getConversationHistory ---

  describe('getConversationHistory', () => {
    it('delegates to messagesService.getRecent', async () => {
      messagesService.getRecent.mockResolvedValue([{ role: 'user', content: 'hi' }]);
      const result = await service.getConversationHistory(botId, 'conv-1');
      expect(result).toHaveLength(1);
      expect(messagesService.getRecent).toHaveBeenCalledWith('conv-1', 50);
    });
  });

  // --- processChat ---

  describe('processChat', () => {
    it('yields conversation event first, then flow events, then done', async () => {
      async function* mockFlowStream() {
        yield { type: 'token' as const, content: 'Hello ' };
        yield { type: 'token' as const, content: 'World' };
        yield { type: 'done' as const, data: {} };
      }
      flowExecService.runFlow.mockReturnValue(mockFlowStream());

      const events = await collect(service.processChat({ botId, message: 'Hi' }));

      expect(events[0].event).toBe('conversation');
      expect(JSON.parse(events[0].data).conversationId).toBe('conv-1');

      const tokenEvents = events.filter((e) => e.event === 'token');
      expect(tokenEvents.length).toBe(2);

      const doneEvent = events[events.length - 1];
      expect(doneEvent.event).toBe('done');
    });

    it('saves user message before dispatching flow', async () => {
      async function* mockFlowStream() {
        yield { type: 'done' as const, data: {} };
      }
      flowExecService.runFlow.mockReturnValue(mockFlowStream());

      await collect(service.processChat({ botId, message: 'Hello' }));

      expect(messagesService.create).toHaveBeenCalledWith(
        expect.objectContaining({ role: 'user', content: 'Hello' }),
      );
    });

    it('persists assistant message from accumulated token content', async () => {
      async function* mockFlowStream() {
        yield { type: 'token' as const, content: 'Hello ' };
        yield { type: 'token' as const, content: 'World' };
        yield { type: 'done' as const, data: {} };
      }
      flowExecService.runFlow.mockReturnValue(mockFlowStream());

      await collect(service.processChat({ botId, message: 'Hi' }));

      expect(messagesService.create).toHaveBeenCalledWith(
        expect.objectContaining({ role: 'assistant', content: 'Hello World' }),
      );
    });

    it('updates conversation stats after flow completes', async () => {
      async function* mockFlowStream() {
        yield { type: 'token' as const, content: 'response' };
        yield { type: 'done' as const, data: {} };
      }
      flowExecService.runFlow.mockReturnValue(mockFlowStream());

      await collect(service.processChat({ botId, message: 'Hi' }));

      expect(conversationsService.updateStats).toHaveBeenCalledWith('conv-1', 'response');
    });

    it('passes history to FlowExecService.runFlow', async () => {
      messagesService.getRecent.mockResolvedValue([
        { role: 'user', content: 'prev message' },
      ]);

      async function* mockFlowStream() {
        yield { type: 'done' as const, data: {} };
      }
      flowExecService.runFlow.mockReturnValue(mockFlowStream());

      await collect(service.processChat({ botId, message: 'Hi' }));

      expect(flowExecService.runFlow).toHaveBeenCalledWith(
        expect.objectContaining({
          history: [{ role: 'user', content: 'prev message' }],
        }),
      );
    });

    it('yields error event and does not throw when flow fails', async () => {
      async function* mockFlowStream() {
        yield { type: 'error' as const, message: 'engine down' };
      }
      flowExecService.runFlow.mockReturnValue(mockFlowStream());

      const events = await collect(service.processChat({ botId, message: 'Hi' }));
      expect(events.some((e) => e.event === 'error')).toBe(true);
    });
  });
});
