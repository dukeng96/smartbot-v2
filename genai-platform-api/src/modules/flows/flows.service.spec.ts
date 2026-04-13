import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { FlowsService, buildSimpleRagFlowData } from './flows.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { FlowData } from './types/flow-data.types';

const VALID_FLOW: FlowData = {
  nodes: [
    { id: 'start-1', type: 'start', position: { x: 0, y: 0 }, data: {} },
    { id: 'reply-1', type: 'direct_reply', position: { x: 200, y: 0 }, data: {} },
  ],
  edges: [{ id: 'e1', source: 'start-1', target: 'reply-1' }],
};

describe('FlowsService', () => {
  let service: FlowsService;
  let prisma: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    const prismaMock = {
      flow: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      bot: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FlowsService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<FlowsService>(FlowsService);
    prisma = module.get(PrismaService);
  });

  afterEach(() => jest.clearAllMocks());

  // --- buildSimpleRagFlowData -------------------------------------------

  describe('buildSimpleRagFlowData', () => {
    it('produces a valid 4-node simple-rag flow', () => {
      const data = buildSimpleRagFlowData();
      expect(data.nodes).toHaveLength(4);
      const types = data.nodes.map((n) => n.type);
      expect(types).toContain('start');
      expect(types).toContain('retriever');
      expect(types).toContain('llm');
      expect(types).toContain('direct_reply');
      expect(data.edges).toHaveLength(3);
    });

    it('passes validateFlowData', () => {
      expect(() => service.validateFlowData(buildSimpleRagFlowData())).not.toThrow();
    });
  });

  // --- validateFlowData -------------------------------------------------

  describe('validateFlowData', () => {
    it('accepts a valid flow', () => {
      expect(() => service.validateFlowData(VALID_FLOW)).not.toThrow();
    });

    it('rejects empty nodes array', () => {
      expect(() =>
        service.validateFlowData({ nodes: [], edges: [] }),
      ).toThrow(BadRequestException);
    });

    it('rejects duplicate node ids', () => {
      const flow: FlowData = {
        nodes: [
          { id: 'x', type: 'start', position: { x: 0, y: 0 }, data: {} },
          { id: 'x', type: 'direct_reply', position: { x: 1, y: 0 }, data: {} },
        ],
        edges: [],
      };
      expect(() => service.validateFlowData(flow)).toThrow(BadRequestException);
    });

    it('rejects unknown node type', () => {
      const flow: FlowData = {
        nodes: [
          { id: 's', type: 'start', position: { x: 0, y: 0 }, data: {} },
          { id: 'u', type: 'unknown_xyz', position: { x: 1, y: 0 }, data: {} },
          { id: 'r', type: 'direct_reply', position: { x: 2, y: 0 }, data: {} },
        ],
        edges: [
          { id: 'e1', source: 's', target: 'u' },
          { id: 'e2', source: 'u', target: 'r' },
        ],
      };
      expect(() => service.validateFlowData(flow)).toThrow(BadRequestException);
    });

    it('rejects flow without start node', () => {
      const flow: FlowData = {
        nodes: [
          { id: 'r', type: 'direct_reply', position: { x: 0, y: 0 }, data: {} },
        ],
        edges: [],
      };
      expect(() => service.validateFlowData(flow)).toThrow(BadRequestException);
    });

    it('rejects flow with two start nodes', () => {
      const flow: FlowData = {
        nodes: [
          { id: 's1', type: 'start', position: { x: 0, y: 0 }, data: {} },
          { id: 's2', type: 'start', position: { x: 1, y: 0 }, data: {} },
          { id: 'r', type: 'direct_reply', position: { x: 2, y: 0 }, data: {} },
        ],
        edges: [],
      };
      expect(() => service.validateFlowData(flow)).toThrow(BadRequestException);
    });

    it('rejects flow without terminal node', () => {
      const flow: FlowData = {
        nodes: [
          { id: 's', type: 'start', position: { x: 0, y: 0 }, data: {} },
          { id: 'l', type: 'llm', position: { x: 1, y: 0 }, data: {} },
        ],
        edges: [{ id: 'e1', source: 's', target: 'l' }],
      };
      expect(() => service.validateFlowData(flow)).toThrow(BadRequestException);
    });

    it('rejects edge with unknown source', () => {
      const flow: FlowData = {
        nodes: [
          { id: 's', type: 'start', position: { x: 0, y: 0 }, data: {} },
          { id: 'r', type: 'direct_reply', position: { x: 1, y: 0 }, data: {} },
        ],
        edges: [{ id: 'e1', source: 'NONEXISTENT', target: 'r' }],
      };
      expect(() => service.validateFlowData(flow)).toThrow(BadRequestException);
    });
  });

  // --- CRUD -------------------------------------------------------------

  describe('create', () => {
    it('persists flow and returns it', async () => {
      const created = { id: 'flow-1', ...VALID_FLOW };
      (prisma.flow.create as jest.Mock).mockResolvedValue(created);
      const result = await service.create('tenant-1', 'user-1', {
        name: 'My Flow',
        flowData: VALID_FLOW,
      });
      expect(result).toBe(created);
      expect(prisma.flow.create).toHaveBeenCalledTimes(1);
    });

    it('throws BadRequestException for invalid flowData', async () => {
      await expect(
        service.create('tenant-1', 'user-1', {
          name: 'Bad',
          flowData: { nodes: [], edges: [] },
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.flow.create).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('throws NotFoundException for missing flow', async () => {
      (prisma.flow.findFirst as jest.Mock).mockResolvedValue(null);
      await expect(service.findOne('tenant-1', 'bad-id')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('remove', () => {
    it('throws ConflictException when bot references flow (P2003)', async () => {
      (prisma.flow.findFirst as jest.Mock).mockResolvedValue({ id: 'flow-1', tenantId: 'tenant-1' });
      (prisma.flow.delete as jest.Mock).mockRejectedValue({ code: 'P2003' });
      (prisma.bot.findMany as jest.Mock).mockResolvedValue([{ id: 'bot-1', name: 'My Bot' }]);
      await expect(service.remove('tenant-1', 'flow-1')).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('swapBotFlow', () => {
    it('updates bot.flowId atomically', async () => {
      (prisma.bot.findFirst as jest.Mock)
        .mockResolvedValueOnce({ id: 'bot-1', name: 'Bot', tenantId: 'tenant-1' })
        .mockResolvedValueOnce(null); // not attached to another bot
      (prisma.flow.findFirst as jest.Mock).mockResolvedValue({ id: 'flow-2', tenantId: 'tenant-1' });
      (prisma.bot.update as jest.Mock).mockResolvedValue({ id: 'bot-1', name: 'Bot', flowId: 'flow-2' });

      const result = await service.swapBotFlow('tenant-1', 'bot-1', 'flow-2');
      expect(result.flowId).toBe('flow-2');
    });

    it('throws ConflictException when flow already attached to another bot', async () => {
      (prisma.bot.findFirst as jest.Mock)
        .mockResolvedValueOnce({ id: 'bot-1', name: 'Bot 1', tenantId: 'tenant-1' })
        .mockResolvedValueOnce({ id: 'bot-2', name: 'Bot 2' }); // already attached
      (prisma.flow.findFirst as jest.Mock).mockResolvedValue({ id: 'flow-2', tenantId: 'tenant-1' });

      await expect(
        service.swapBotFlow('tenant-1', 'bot-1', 'flow-2'),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('throws NotFoundException when flow belongs to different tenant', async () => {
      (prisma.bot.findFirst as jest.Mock).mockResolvedValueOnce({ id: 'bot-1', tenantId: 'tenant-1' });
      (prisma.flow.findFirst as jest.Mock).mockResolvedValue(null);
      await expect(
        service.swapBotFlow('tenant-1', 'bot-1', 'foreign-flow'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
