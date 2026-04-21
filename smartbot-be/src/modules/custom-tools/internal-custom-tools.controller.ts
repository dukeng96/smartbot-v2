import { Controller, Get, Headers, NotFoundException, Param, UseGuards } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { InternalApiKeyGuard } from '../../common/guards/internal-api-key.guard';
import { PrismaService } from '../../common/prisma/prisma.service';

@ApiExcludeController()
@Controller('internal/custom-tools')
@UseGuards(InternalApiKeyGuard)
export class InternalCustomToolsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get(':id')
  async findById(
    @Param('id') id: string,
    @Headers('x-tenant-id') tenantId?: string,
  ) {
    const where = tenantId ? { id, tenantId } : { id };
    const tool = await this.prisma.customTool.findFirst({ where });
    if (!tool) throw new NotFoundException('Custom tool not found');
    return {
      id: tool.id,
      name: tool.name,
      description: tool.description,
      schema: tool.schema,
      implementation: tool.implementation,
      createdAt: tool.createdAt,
    };
  }
}
