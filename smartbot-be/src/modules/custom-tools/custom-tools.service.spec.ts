import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { CustomToolsService } from './custom-tools.service';
import { PrismaService } from '../../common/prisma/prisma.service';

const VALID_TOOL = {
  name: 'search_web',
  description: 'Searches the web',
  schema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] },
  implementation: 'def run(query): return {"result": query}',
};

describe('CustomToolsService', () => {
  let service: CustomToolsService;
  let prisma: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    const prismaMock = {
      customTool: {
        count: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      $queryRaw: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomToolsService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<CustomToolsService>(CustomToolsService);
    prisma = module.get(PrismaService);
  });

  afterEach(() => jest.clearAllMocks());

  // --- create -----------------------------------------------------------

  describe('create', () => {
    it('persists tool and returns it', async () => {
      (prisma.customTool.count as jest.Mock).mockResolvedValue(0);
      const created = { id: 'tool-1', ...VALID_TOOL, tenantId: 'tenant-1' };
      (prisma.customTool.create as jest.Mock).mockResolvedValue(created);

      const result = await service.create('tenant-1', 'user-1', VALID_TOOL);
      expect(result).toBe(created);
    });

    it('throws ForbiddenException when cap reached', async () => {
      (prisma.customTool.count as jest.Mock).mockResolvedValue(50);
      await expect(
        service.create('tenant-1', 'user-1', VALID_TOOL),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.customTool.create).not.toHaveBeenCalled();
    });

    it('throws BadRequestException for null schema', async () => {
      (prisma.customTool.count as jest.Mock).mockResolvedValue(0);
      await expect(
        service.create('tenant-1', 'user-1', { ...VALID_TOOL, schema: null as any }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws ConflictException on duplicate name (P2002)', async () => {
      (prisma.customTool.count as jest.Mock).mockResolvedValue(0);
      (prisma.customTool.create as jest.Mock).mockRejectedValue({ code: 'P2002' });
      await expect(
        service.create('tenant-1', 'user-1', VALID_TOOL),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  // --- findOne ----------------------------------------------------------

  describe('findOne', () => {
    it('throws NotFoundException for missing tool', async () => {
      (prisma.customTool.findFirst as jest.Mock).mockResolvedValue(null);
      await expect(service.findOne('tenant-1', 'bad-id')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('returns tool when found', async () => {
      const tool = { id: 'tool-1', ...VALID_TOOL, tenantId: 'tenant-1' };
      (prisma.customTool.findFirst as jest.Mock).mockResolvedValue(tool);
      const result = await service.findOne('tenant-1', 'tool-1');
      expect(result).toBe(tool);
    });
  });

  // --- remove -----------------------------------------------------------

  describe('remove', () => {
    it('deletes tool successfully', async () => {
      const tool = { id: 'tool-1', tenantId: 'tenant-1' };
      (prisma.customTool.findFirst as jest.Mock).mockResolvedValue(tool);
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([]);
      (prisma.customTool.delete as jest.Mock).mockResolvedValue(tool);

      const result = await service.remove('tenant-1', 'tool-1');
      expect(result).toEqual({ deleted: true });
    });

    it('throws ConflictException when tool referenced by a flow', async () => {
      const tool = { id: 'tool-1', tenantId: 'tenant-1' };
      (prisma.customTool.findFirst as jest.Mock).mockResolvedValue(tool);
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ id: 'flow-1', name: 'My Flow' }]);

      await expect(service.remove('tenant-1', 'tool-1')).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.customTool.delete).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when tool not found', async () => {
      (prisma.customTool.findFirst as jest.Mock).mockResolvedValue(null);
      await expect(service.remove('tenant-1', 'bad-id')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  // --- cross-tenant isolation ------------------------------------------

  describe('tenant isolation', () => {
    it('update returns 404 for cross-tenant tool id', async () => {
      (prisma.customTool.findFirst as jest.Mock).mockResolvedValue(null);
      await expect(
        service.update('tenant-2', 'tool-1', { description: 'hacked' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
