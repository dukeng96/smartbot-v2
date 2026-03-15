import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { KnowledgeBasesService } from './knowledge-bases.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { createPrismaMock } from '../../common/testing/prisma-mock.helper';

describe('KnowledgeBasesService', () => {
  let service: KnowledgeBasesService;
  let prisma: ReturnType<typeof createPrismaMock>;

  const tenantId = 'tenant-1';
  const kbId = 'kb-1';
  const mockKb = {
    id: kbId,
    tenantId,
    name: 'Test KB',
    description: 'Test knowledge base',
    chunkSize: 500,
    chunkOverlap: 50,
    vectorCollection: 'kb_kb1',
    totalDocuments: 0,
    totalChars: BigInt(0),
    status: 'active',
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    _count: { documents: 0, bots: 0 },
  };

  beforeEach(async () => {
    prisma = createPrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KnowledgeBasesService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('http://localhost:8000') },
        },
      ],
    }).compile();

    service = module.get<KnowledgeBasesService>(KnowledgeBasesService);
  });

  describe('create', () => {
    it('should create a knowledge base and set vectorCollection', async () => {
      const createdKb = { ...mockKb, vectorCollection: null };
      prisma.knowledgeBase.create.mockResolvedValue(createdKb);
      prisma.knowledgeBase.update.mockResolvedValue({
        ...mockKb,
        vectorCollection: `kb_${kbId.replace(/-/g, '')}`,
      });

      const result = await service.create(tenantId, {
        name: 'Test KB',
        description: 'Test knowledge base',
      });

      expect(result.vectorCollection).toContain('kb_');
      expect(prisma.knowledgeBase.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId,
          name: 'Test KB',
          chunkSize: 500,
          chunkOverlap: 50,
        }),
      });
    });

    it('should use custom chunk settings', async () => {
      prisma.knowledgeBase.create.mockResolvedValue(mockKb);
      prisma.knowledgeBase.update.mockResolvedValue(mockKb);

      await service.create(tenantId, {
        name: 'Custom KB',
        chunkSize: 1000,
        chunkOverlap: 100,
      });

      expect(prisma.knowledgeBase.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          chunkSize: 1000,
          chunkOverlap: 100,
        }),
      });
    });
  });

  describe('findAll', () => {
    it('should return paginated knowledge bases', async () => {
      prisma.knowledgeBase.findMany.mockResolvedValue([mockKb]);
      prisma.knowledgeBase.count.mockResolvedValue(1);

      const result = await service.findAll(tenantId, {
        page: 1,
        limit: 20,
        sort: 'createdAt',
        order: 'desc' as const,
        get skip() { return 0; },
      });

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });
  });

  describe('findOne', () => {
    it('should return a knowledge base', async () => {
      prisma.knowledgeBase.findFirst.mockResolvedValue(mockKb);

      const result = await service.findOne(tenantId, kbId);

      expect(result.name).toBe('Test KB');
    });

    it('should throw NotFoundException if not found', async () => {
      prisma.knowledgeBase.findFirst.mockResolvedValue(null);

      await expect(service.findOne(tenantId, 'bad-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update knowledge base fields', async () => {
      prisma.knowledgeBase.findFirst.mockResolvedValue(mockKb);
      prisma.knowledgeBase.update.mockResolvedValue({
        ...mockKb,
        name: 'Updated KB',
      });

      const result = await service.update(tenantId, kbId, { name: 'Updated KB' });

      expect(result.name).toBe('Updated KB');
    });

    it('should throw NotFoundException for non-existent KB', async () => {
      prisma.knowledgeBase.findFirst.mockResolvedValue(null);

      await expect(
        service.update(tenantId, 'bad-id', { name: 'X' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('softDelete', () => {
    it('should set deletedAt on knowledge base', async () => {
      prisma.knowledgeBase.findFirst.mockResolvedValue(mockKb);
      prisma.knowledgeBase.update.mockResolvedValue({
        ...mockKb,
        deletedAt: new Date(),
      });

      const result = await service.softDelete(tenantId, kbId);

      expect(result.deletedAt).toBeDefined();
    });

    it('should throw NotFoundException for non-existent KB', async () => {
      prisma.knowledgeBase.findFirst.mockResolvedValue(null);

      await expect(service.softDelete(tenantId, 'bad-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
