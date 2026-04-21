import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getQueueToken } from '@nestjs/bullmq';
import { DocumentsService } from './documents.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { createPrismaMock } from '../../common/testing/prisma-mock.helper';

describe('DocumentsService', () => {
  let service: DocumentsService;
  let prisma: ReturnType<typeof createPrismaMock>;
  let mockQueue: { add: jest.Mock };
  let mockStorage: { upload: jest.Mock };

  const tenantId = 'tenant-1';
  const kbId = 'kb-1';
  const docId = 'doc-1';

  const mockKb = {
    id: kbId,
    tenantId,
    name: 'Test KB',
    chunkSize: 500,
    chunkOverlap: 50,
    deletedAt: null,
  };

  const mockDoc = {
    id: docId,
    knowledgeBaseId: kbId,
    tenantId,
    sourceType: 'file_upload',
    originalName: 'test.pdf',
    mimeType: 'application/pdf',
    fileSize: BigInt(1024),
    storagePath: 'uploads/test.pdf',
    sourceUrl: null,
    status: 'completed',
    processingStep: null,
    processingProgress: 100,
    charCount: BigInt(500),
    chunkCount: 5,
    enabled: true,
    markdownStoragePath: null,
    processingStartedAt: null,
    processingCompletedAt: null,
    errorMessage: null,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    prisma = createPrismaMock();
    mockQueue = { add: jest.fn().mockResolvedValue({}) };
    mockStorage = { upload: jest.fn().mockResolvedValue('uploads/test.pdf') };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentsService,
        { provide: PrismaService, useValue: prisma },
        { provide: StorageService, useValue: mockStorage },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('http://localhost:8000') },
        },
        { provide: getQueueToken('document-processing'), useValue: mockQueue },
      ],
    }).compile();

    service = module.get<DocumentsService>(DocumentsService);
  });

  describe('uploadFile', () => {
    it('should create document and enqueue processing', async () => {
      prisma.knowledgeBase.findFirst.mockResolvedValue(mockKb);
      prisma.document.create.mockResolvedValue(mockDoc);

      const file = {
        originalname: 'test.pdf',
        mimetype: 'application/pdf',
        size: 1024,
      } as Express.Multer.File;

      const result = await service.uploadFile(tenantId, kbId, file);

      expect(result.id).toBe(docId);
      expect(mockStorage.upload).toHaveBeenCalledWith(file);
      expect(mockQueue.add).toHaveBeenCalledWith(
        'process-document',
        expect.objectContaining({ documentId: docId, knowledgeBaseId: kbId }),
        expect.objectContaining({ attempts: 3 }),
      );
    });

    it('should throw NotFoundException if KB not found', async () => {
      prisma.knowledgeBase.findFirst.mockResolvedValue(null);

      await expect(
        service.uploadFile(tenantId, 'bad-kb', {} as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('createFromUrl', () => {
    it('should create document from URL and enqueue', async () => {
      prisma.knowledgeBase.findFirst.mockResolvedValue(mockKb);
      const urlDoc = {
        ...mockDoc,
        sourceType: 'url_crawl',
        sourceUrl: 'https://example.com',
      };
      prisma.document.create.mockResolvedValue(urlDoc);

      const result = await service.createFromUrl(
        tenantId,
        kbId,
        'https://example.com',
      );

      expect(result.sourceType).toBe('url_crawl');
      expect(mockQueue.add).toHaveBeenCalled();
    });
  });

  describe('createFromText', () => {
    it('should create document from text and enqueue', async () => {
      prisma.knowledgeBase.findFirst.mockResolvedValue(mockKb);
      const textDoc = { ...mockDoc, sourceType: 'text_input' };
      prisma.document.create.mockResolvedValue(textDoc);

      const result = await service.createFromText(
        tenantId,
        kbId,
        'Hello world',
        'My Note',
      );

      expect(result.sourceType).toBe('text_input');
      expect(prisma.document.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          sourceType: 'text_input',
          originalName: 'My Note',
          charCount: BigInt(11),
        }),
      });
    });

    it('should default name to "Text Input"', async () => {
      prisma.knowledgeBase.findFirst.mockResolvedValue(mockKb);
      prisma.document.create.mockResolvedValue(mockDoc);

      await service.createFromText(tenantId, kbId, 'content');

      expect(prisma.document.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ originalName: 'Text Input' }),
      });
    });
  });

  describe('findAll', () => {
    it('should return paginated documents', async () => {
      prisma.document.findMany.mockResolvedValue([mockDoc]);
      prisma.document.count.mockResolvedValue(1);

      const result = await service.findAll(tenantId, kbId, {
        page: 1,
        limit: 20,
        sort: 'createdAt',
        order: 'desc' as const,
        get skip() {
          return 0;
        },
      });

      expect(result.items).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });
  });

  describe('findOne', () => {
    it('should return a document', async () => {
      prisma.document.findFirst.mockResolvedValue(mockDoc);

      const result = await service.findOne(tenantId, kbId, docId);

      expect(result.originalName).toBe('test.pdf');
    });

    it('should throw NotFoundException if not found', async () => {
      prisma.document.findFirst.mockResolvedValue(null);

      await expect(service.findOne(tenantId, kbId, 'bad-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('softDelete', () => {
    it('should soft-delete document and update KB totals', async () => {
      prisma.document.findFirst.mockResolvedValue(mockDoc);
      prisma.document.update.mockResolvedValue({
        ...mockDoc,
        deletedAt: new Date(),
      });
      prisma.document.aggregate.mockResolvedValue({
        _count: 0,
        _sum: { charCount: BigInt(0) },
      });
      prisma.knowledgeBase.update.mockResolvedValue({});

      const result = await service.softDelete(tenantId, kbId, docId);

      expect(result.message).toBe('Document deleted');
      expect(prisma.knowledgeBase.update).toHaveBeenCalled();
    });
  });

  describe('reprocess', () => {
    it('should reset status and re-enqueue', async () => {
      prisma.document.findFirst.mockResolvedValue(mockDoc);
      prisma.knowledgeBase.findFirst.mockResolvedValue(mockKb);
      prisma.document.update.mockResolvedValue({
        ...mockDoc,
        status: 'pending',
        processingProgress: 0,
      });

      const result = await service.reprocess(tenantId, kbId, docId);

      expect(result.message).toContain('reprocessing');
      expect(mockQueue.add).toHaveBeenCalled();
    });
  });

  describe('reprocessAll', () => {
    it('should reprocess all documents in KB', async () => {
      prisma.knowledgeBase.findFirst.mockResolvedValue(mockKb);
      prisma.document.findMany.mockResolvedValue([
        mockDoc,
        { ...mockDoc, id: 'doc-2' },
      ]);
      prisma.document.update.mockResolvedValue({});

      const result = await service.reprocessAll(tenantId, kbId);

      expect(result.message).toContain('2 documents');
      expect(mockQueue.add).toHaveBeenCalledTimes(2);
    });
  });

  describe('updateStatus', () => {
    it('should update document status from AI Engine callback', async () => {
      prisma.document.findUnique.mockResolvedValue(mockDoc);
      prisma.document.update.mockResolvedValue({});
      prisma.document.aggregate.mockResolvedValue({
        _count: 1,
        _sum: { charCount: BigInt(500) },
      });
      prisma.knowledgeBase.update.mockResolvedValue({});

      const result = await service.updateStatus(docId, {
        status: 'completed',
        charCount: 500,
        chunkCount: 5,
      });

      expect(result.message).toBe('Status updated');
    });

    it('should set processingStartedAt on "processing" status', async () => {
      prisma.document.findUnique.mockResolvedValue({
        ...mockDoc,
        processingStartedAt: null,
      });
      prisma.document.update.mockResolvedValue({});

      await service.updateStatus(docId, { status: 'processing' });

      expect(prisma.document.update).toHaveBeenCalledWith({
        where: { id: docId },
        data: expect.objectContaining({
          status: 'processing',
          processingStartedAt: expect.any(Date),
        }),
      });
    });

    it('should throw NotFoundException for unknown document', async () => {
      prisma.document.findUnique.mockResolvedValue(null);

      await expect(
        service.updateStatus('bad-id', { status: 'completed' }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
