import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InternalCustomToolsController } from './internal-custom-tools.controller';
import { InternalApiKeyGuard } from '../../common/guards/internal-api-key.guard';
import { PrismaService } from '../../common/prisma/prisma.service';

const VALID_KEY = 'test-internal-key-abc123';

const MOCK_TOOL = {
  id: 'tool-uuid-1',
  tenantId: 'tenant-1',
  name: 'add_numbers',
  description: 'Adds two numbers',
  schema: { type: 'object', properties: { a: { type: 'number' }, b: { type: 'number' } } },
  implementation: 'output = {"sum": inputs["a"] + inputs["b"]}',
  createdAt: new Date('2026-01-01'),
};

describe('InternalCustomToolsController', () => {
  let controller: InternalCustomToolsController;
  let prisma: any;
  let guard: InternalApiKeyGuard;

  beforeEach(async () => {
    prisma = {
      customTool: {
        findFirst: jest.fn(),
      },
    };

    const configService = {
      get: jest.fn().mockReturnValue(VALID_KEY),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [InternalCustomToolsController],
      providers: [
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: configService },
        InternalApiKeyGuard,
      ],
    }).compile();

    controller = module.get<InternalCustomToolsController>(InternalCustomToolsController);
    guard = module.get<InternalApiKeyGuard>(InternalApiKeyGuard);
  });

  afterEach(() => jest.clearAllMocks());

  // --- Test 1: returns tool row with valid InternalApiKey ---

  it('returns tool with required fields when valid X-Internal-Key is supplied', async () => {
    (prisma.customTool.findFirst as jest.Mock).mockResolvedValue(MOCK_TOOL);

    const result = await controller.findById('tool-uuid-1', 'tenant-1');

    expect(result).toMatchObject({
      id: 'tool-uuid-1',
      name: 'add_numbers',
      description: 'Adds two numbers',
      schema: expect.objectContaining({ type: 'object' }),
      implementation: expect.stringContaining('output'),
    });

    // implementation must be included (engine needs it to run sandbox)
    expect(result.implementation).toBeDefined();
    expect(typeof result.implementation).toBe('string');

    expect(prisma.customTool.findFirst).toHaveBeenCalledWith({
      where: { id: 'tool-uuid-1', tenantId: 'tenant-1' },
    });
  });

  it('queries without tenantId filter when x-tenant-id header is absent', async () => {
    (prisma.customTool.findFirst as jest.Mock).mockResolvedValue(MOCK_TOOL);

    await controller.findById('tool-uuid-1', undefined);

    expect(prisma.customTool.findFirst).toHaveBeenCalledWith({
      where: { id: 'tool-uuid-1' },
    });
  });

  it('throws NotFoundException when tool does not exist', async () => {
    (prisma.customTool.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(controller.findById('nonexistent', 'tenant-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  // --- Test 2: guard rejects requests without valid key ---

  it('InternalApiKeyGuard throws UnauthorizedException when X-Internal-Key is missing', () => {
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({ headers: {} }),
      }),
    } as any;

    expect(() => guard.canActivate(mockContext)).toThrow(UnauthorizedException);
  });

  it('InternalApiKeyGuard throws UnauthorizedException when X-Internal-Key is wrong', () => {
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({ headers: { 'x-internal-key': 'wrong-key' } }),
      }),
    } as any;

    expect(() => guard.canActivate(mockContext)).toThrow(UnauthorizedException);
  });

  it('InternalApiKeyGuard returns true when X-Internal-Key matches', () => {
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({ headers: { 'x-internal-key': VALID_KEY } }),
      }),
    } as any;

    expect(guard.canActivate(mockContext)).toBe(true);
  });
});
