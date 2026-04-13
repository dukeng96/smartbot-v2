import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateCustomToolDto } from './dto/create-custom-tool.dto';
import { UpdateCustomToolDto } from './dto/update-custom-tool.dto';

const CUSTOM_TOOL_CAP_PER_TENANT = 50;

@Injectable()
export class CustomToolsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, userId: string, dto: CreateCustomToolDto) {
    const count = await this.prisma.customTool.count({ where: { tenantId } });
    if (count >= CUSTOM_TOOL_CAP_PER_TENANT) {
      throw new ForbiddenException(
        `Max ${CUSTOM_TOOL_CAP_PER_TENANT} custom tools per tenant`,
      );
    }

    this.validateSchema(dto.schema);

    try {
      return await this.prisma.customTool.create({
        data: {
          tenantId,
          createdBy: userId,
          name: dto.name,
          description: dto.description ?? null,
          schema: dto.schema,
          implementation: dto.implementation,
        },
      });
    } catch (e: any) {
      if (e.code === 'P2002') {
        throw new ConflictException(`Tool name '${dto.name}' already exists`);
      }
      throw e;
    }
  }

  async findAll(tenantId: string) {
    return this.prisma.customTool.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        tenantId: true,
        name: true,
        description: true,
        schema: true,
        createdBy: true,
        createdAt: true,
        updatedAt: true,
        // implementation excluded from list — only in detail
      },
    });
  }

  async findOne(tenantId: string, id: string) {
    const tool = await this.prisma.customTool.findFirst({
      where: { id, tenantId },
    });
    if (!tool) throw new NotFoundException('Custom tool not found');
    return tool;
  }

  async update(tenantId: string, id: string, dto: UpdateCustomToolDto) {
    await this.assertOwned(tenantId, id);
    if (dto.schema !== undefined) {
      this.validateSchema(dto.schema);
    }
    return this.prisma.customTool.update({
      where: { id },
      data: {
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.schema !== undefined && { schema: dto.schema }),
        ...(dto.implementation !== undefined && { implementation: dto.implementation }),
      },
    });
  }

  async remove(tenantId: string, id: string) {
    await this.assertOwned(tenantId, id);

    // Block delete if any Agent node in any flow references this tool ID.
    const referencingFlows = await this.prisma.$queryRaw<{ id: string; name: string }[]>`
      SELECT id, name FROM flows
      WHERE tenant_id = ${tenantId}::uuid
        AND flow_data @? ${'$.nodes[*] ? (@.type == "agent" && @.data.tools[*] == "' + id + '")'}`
    ;

    if (referencingFlows.length > 0) {
      throw new ConflictException({
        message: 'Tool is referenced by one or more flows. Remove it from those flows first.',
        flows: referencingFlows.map((f) => ({ id: f.id, name: f.name })),
      });
    }

    await this.prisma.customTool.delete({ where: { id } });
    return { deleted: true };
  }

  private validateSchema(schema: Record<string, any>): void {
    if (typeof schema !== 'object' || schema === null) {
      throw new BadRequestException('schema must be a non-null JSON object');
    }
  }

  private async assertOwned(tenantId: string, id: string) {
    const tool = await this.prisma.customTool.findFirst({ where: { id, tenantId } });
    if (!tool) throw new NotFoundException('Custom tool not found');
    return tool;
  }
}
