import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { FlowExecService } from './flow-exec.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CredentialsService } from '../credentials/credentials.service';
import { CreditsService } from '../billing/credits.service';
import { EngineClient } from './engine-client';
import type { RunFlowParams } from './types/sse-event.types';

const MOCK_FLOW_PARAMS: RunFlowParams = {
  flow: {
    id: 'flow-1',
    flowData: {
      nodes: [
        { id: 'start-1', type: 'start', position: { x: 0, y: 0 }, data: {} },
        { id: 'end-1', type: 'end', position: { x: 100, y: 0 }, data: {} },
      ],
      edges: [{ id: 'e1', source: 'start-1', target: 'end-1' }],
      viewport: { x: 0, y: 0, zoom: 1 },
    },
  },
  botId: 'bot-1',
  tenantId: 'tenant-1',
  sessionId: 'bot-1:conv-1',
  message: 'Hello',
  conversationId: 'conv-1',
  history: [],
};

async function collect<T>(gen: AsyncIterable<T>): Promise<T[]> {
  const result: T[] = [];
  for await (const item of gen) result.push(item);
  return result;
}

describe('FlowExecService', () => {
  let service: FlowExecService;
  let prisma: any;
  let credentialsService: jest.Mocked<Partial<CredentialsService>>;
  let creditsService: jest.Mocked<Partial<CreditsService>>;
  let engineClient: jest.Mocked<Partial<EngineClient>>;

  beforeEach(async () => {
    prisma = {
      flowExecution: {
        create: jest.fn().mockResolvedValue({ id: 'exec-1' }),
        update: jest.fn().mockResolvedValue({}),
      },
    };

    credentialsService = {
      decryptById: jest.fn().mockResolvedValue({ apiKey: 'sk-test', baseUrl: 'http://engine' }),
    };

    creditsService = {
      getCurrentUsage: jest.fn().mockResolvedValue({
        creditsAllocated: 100,
        creditsUsed: 0,
        topUpCredits: 0,
      }),
      increment: jest.fn().mockResolvedValue(undefined),
    };

    engineClient = {
      executeStream: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FlowExecService,
        { provide: PrismaService, useValue: prisma },
        { provide: CredentialsService, useValue: credentialsService },
        { provide: CreditsService, useValue: creditsService },
        { provide: EngineClient, useValue: engineClient },
      ],
    }).compile();

    service = module.get<FlowExecService>(FlowExecService);
  });

  afterEach(() => jest.clearAllMocks());

  // --- quota pre-check ---

  it('throws ForbiddenException when tenant has 0 remaining credits', async () => {
    (creditsService.getCurrentUsage as jest.Mock).mockResolvedValue({
      creditsAllocated: 10,
      creditsUsed: 10,
      topUpCredits: 0,
    });

    await expect(collect(service.runFlow(MOCK_FLOW_PARAMS))).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.flowExecution.create).not.toHaveBeenCalled();
  });

  // --- happy path ---

  it('creates FlowExecution row and yields token + done events', async () => {
    async function* mockStream() {
      yield { type: 'flow_start' as const };
      yield { type: 'token' as const, data: { content: 'Hello' } };
      yield { type: 'token' as const, data: { content: ' world' } };
      yield { type: 'done' as const, data: {} };
    }
    (engineClient.executeStream as jest.Mock).mockReturnValue(mockStream());

    const events = await collect(service.runFlow(MOCK_FLOW_PARAMS));

    expect(prisma.flowExecution.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ state: 'INPROGRESS' }) }),
    );

    const types = events.map((e) => e.type);
    expect(types).toContain('token');
    expect(types).toContain('done');

    // FINISHED state persisted
    expect(prisma.flowExecution.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ state: 'FINISHED' }) }),
    );
  });

  // --- credit accounting ---

  it('accumulates VNPT credits from llm_call_completed events', async () => {
    async function* mockStream() {
      yield { type: 'llm_call_completed' as const, data: { provider: 'vnpt', model: 'llm-large-v4' } };
      yield { type: 'llm_call_completed' as const, data: { provider: 'vnpt', model: 'llm-medium-v4' } };
      yield { type: 'done' as const, data: {} };
    }
    (engineClient.executeStream as jest.Mock).mockReturnValue(mockStream());

    const events = await collect(service.runFlow(MOCK_FLOW_PARAMS));

    // llm_call_completed NOT forwarded to client
    expect(events.every((e) => e.type !== 'llm_call_completed')).toBe(true);

    // 4 (large) + 2 (medium) = 6 credits
    expect(creditsService.increment).toHaveBeenCalledWith('tenant-1', 6);
  });

  it('does not charge credits for non-VNPT llm calls (no llm_call_completed emitted)', async () => {
    async function* mockStream() {
      yield { type: 'token' as const, data: { content: 'hi' } };
      yield { type: 'done' as const, data: {} };
    }
    (engineClient.executeStream as jest.Mock).mockReturnValue(mockStream());

    await collect(service.runFlow(MOCK_FLOW_PARAMS));

    expect(creditsService.increment).not.toHaveBeenCalled();
  });

  // --- error handling ---

  it('sets FlowExecution state=ERROR on engine failure and yields error event', async () => {
    async function* mockStream() {
      yield { type: 'token' as const, data: { content: 'partial' } };
      throw new Error('Engine crashed');
    }
    (engineClient.executeStream as jest.Mock).mockReturnValue(mockStream());

    const events = await collect(service.runFlow(MOCK_FLOW_PARAMS));

    expect(events.some((e) => e.type === 'error')).toBe(true);
    expect(prisma.flowExecution.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ state: 'ERROR' }) }),
    );
  });

  // --- forwarded event types ---

  it('does not forward llm_call_completed to client', async () => {
    async function* mockStream() {
      yield { type: 'llm_call_completed' as const, data: { provider: 'vnpt', model: 'llm-small-v4' } };
      yield { type: 'done' as const, data: {} };
    }
    (engineClient.executeStream as jest.Mock).mockReturnValue(mockStream());

    const events = await collect(service.runFlow(MOCK_FLOW_PARAMS));
    expect(events.find((e) => e.type === 'llm_call_completed')).toBeUndefined();
  });

  it('forwards awaiting_input event with node_id and data', async () => {
    async function* mockStream() {
      yield {
        type: 'awaiting_input' as const,
        node_id: 'human-1',
        data: { prompt: 'Approve?', context: {} },
      };
      yield { type: 'done' as const, data: {} };
    }
    (engineClient.executeStream as jest.Mock).mockReturnValue(mockStream());

    const events = await collect(service.runFlow(MOCK_FLOW_PARAMS));
    const awaitEv = events.find((e) => e.type === 'awaiting_input');
    expect(awaitEv).toBeDefined();
    expect(awaitEv?.node_id).toBe('human-1');
  });
});
