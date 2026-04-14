import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateFlowDto } from './dto/create-flow.dto';
import { UpdateFlowDto } from './dto/update-flow.dto';
import { FlowData, FlowNode, FlowEdge } from './types/flow-data.types';

const VALID_NODE_TYPES = new Set([
  'start', 'end', 'llm', 'condition', 'set_variable', 'http_request',
  'knowledge_base', 'code', 'text_formatter', 'sticky_note', 'memory',
  'agent', 'custom_tool', 'human_input',
]);

const TERMINAL_NODE_TYPES = new Set(['end']);

// Minimal simple-rag flow provisioned for every new bot.
// Phase 10 replaces this with full template set.
export function buildSimpleRagFlowData(): FlowData {
  return {
    nodes: [
      {
        id: 'start-1',
        type: 'start',
        position: { x: 100, y: 200 },
        data: {},
      },
      {
        id: 'kb-1',
        type: 'knowledge_base',
        position: { x: 350, y: 200 },
        data: { kb_id: '', top_k: 5 },
      },
      {
        id: 'llm-1',
        type: 'llm',
        position: { x: 600, y: 200 },
        data: {
          model: 'llm-medium-v4',
          systemPrompt: 'You are a helpful assistant. Use the retrieved context to answer questions accurately.',
          temperature: 0.7,
        },
      },
      {
        id: 'end-1',
        type: 'end',
        position: { x: 850, y: 200 },
        data: {},
      },
    ],
    edges: [
      { id: 'e1', source: 'start-1', target: 'kb-1' },
      { id: 'e2', source: 'kb-1', target: 'llm-1' },
      { id: 'e3', source: 'llm-1', target: 'end-1' },
    ],
    viewport: { x: 0, y: 0, zoom: 1 },
  };
}

@Injectable()
export class FlowsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, userId: string, dto: CreateFlowDto) {
    this.validateFlowData(dto.flowData);
    return this.prisma.flow.create({
      data: {
        tenantId,
        createdBy: userId,
        name: dto.name,
        description: dto.description ?? null,
        type: dto.type ?? 'agentflow',
        flowData: dto.flowData as any,
      },
    });
  }

  // Provisions the minimal simple-rag flow for a new bot — called from BotsService.
  async provisionSimpleRag(tenantId: string, userId: string, name: string) {
    return this.prisma.flow.create({
      data: {
        tenantId,
        createdBy: userId,
        name,
        description: 'Auto-provisioned simple RAG flow',
        type: 'agentflow',
        flowData: buildSimpleRagFlowData() as any,
      },
    });
  }

  async findAll(tenantId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.flow.findMany({
        where: { tenantId },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          description: true,
          type: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.flow.count({ where: { tenantId } }),
    ]);
    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(tenantId: string, id: string) {
    const flow = await this.prisma.flow.findFirst({ where: { id, tenantId } });
    if (!flow) throw new NotFoundException('Flow not found');
    return flow;
  }

  async update(tenantId: string, id: string, dto: UpdateFlowDto) {
    await this.assertOwned(tenantId, id);
    if (dto.flowData) {
      this.validateFlowData(dto.flowData);
    }
    return this.prisma.flow.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.flowData !== undefined && { flowData: dto.flowData as any }),
      },
    });
  }

  async remove(tenantId: string, id: string) {
    await this.assertOwned(tenantId, id);
    // Prisma onDelete:Restrict on Bot.flowId will throw P2003 if a bot references this flow.
    try {
      await this.prisma.flow.delete({ where: { id } });
    } catch (e: any) {
      if (e.code === 'P2003') {
        const bots = await this.prisma.bot.findMany({
          where: { flowId: id },
          select: { id: true, name: true },
        });
        throw new ConflictException({
          message: 'Flow is attached to one or more bots. Swap their flow first.',
          bots,
        });
      }
      throw e;
    }
    return { deleted: true };
  }

  async duplicate(tenantId: string, userId: string, id: string) {
    const source = await this.findOne(tenantId, id);
    return this.prisma.flow.create({
      data: {
        tenantId,
        createdBy: userId,
        name: `${source.name} (copy)`,
        description: source.description,
        type: source.type,
        flowData: source.flowData as any,
      },
    });
  }

  // Atomically swaps a bot's attached flow. Verifies:
  // 1. New flow belongs to same tenant
  // 2. New flow is not already attached to another bot
  async swapBotFlow(tenantId: string, botId: string, newFlowId: string) {
    const [bot, newFlow] = await Promise.all([
      this.prisma.bot.findFirst({ where: { id: botId, tenantId } }),
      this.prisma.flow.findFirst({ where: { id: newFlowId, tenantId } }),
    ]);

    if (!bot) throw new NotFoundException('Bot not found');
    if (!newFlow) throw new NotFoundException('Flow not found');

    const alreadyAttached = await this.prisma.bot.findFirst({
      where: { flowId: newFlowId, id: { not: botId } },
    });
    if (alreadyAttached) {
      throw new ConflictException(
        `Flow is already attached to bot '${alreadyAttached.name}'. Each bot requires its own flow.`,
      );
    }

    return this.prisma.bot.update({
      where: { id: botId },
      data: { flowId: newFlowId },
      select: { id: true, name: true, flowId: true },
    });
  }

  // Lightweight NestJS-side DAG validation — no engine dependency.
  validateFlowData(flowData: FlowData): void {
    const { nodes, edges } = flowData;

    if (!Array.isArray(nodes) || nodes.length === 0) {
      throw new BadRequestException('Flow must have at least one node');
    }
    if (!Array.isArray(edges)) {
      throw new BadRequestException('Flow edges must be an array');
    }

    // Duplicate node IDs
    const nodeIds = new Set<string>();
    for (const node of nodes) {
      if (nodeIds.has(node.id)) {
        throw new BadRequestException(`Duplicate node id: ${node.id}`);
      }
      nodeIds.add(node.id);
    }

    // Invalid node types
    const invalidTypes = nodes
      .filter((n) => !VALID_NODE_TYPES.has(n.type))
      .map((n) => n.type);
    if (invalidTypes.length > 0) {
      throw new BadRequestException(`Unknown node types: ${invalidTypes.join(', ')}`);
    }

    // Exactly one start node
    const startNodes = nodes.filter((n) => n.type === 'start');
    if (startNodes.length !== 1) {
      throw new BadRequestException(
        `Flow must have exactly one 'start' node (found ${startNodes.length})`,
      );
    }

    // At least one terminal node
    const hasTerminal = nodes.some((n) => TERMINAL_NODE_TYPES.has(n.type));
    if (!hasTerminal) {
      throw new BadRequestException(
        `Flow must have at least one terminal node (end)`,
      );
    }

    // Edge references valid node IDs
    for (const edge of edges) {
      if (!nodeIds.has(edge.source)) {
        throw new BadRequestException(`Edge '${edge.id}' references unknown source node: ${edge.source}`);
      }
      if (!nodeIds.has(edge.target)) {
        throw new BadRequestException(`Edge '${edge.id}' references unknown target node: ${edge.target}`);
      }
    }
  }

  private async assertOwned(tenantId: string, id: string) {
    const flow = await this.prisma.flow.findFirst({ where: { id, tenantId } });
    if (!flow) throw new NotFoundException('Flow not found');
    return flow;
  }
}
