import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { CredentialsService } from './credentials.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { encrypt, decrypt } from './crypto.util';
import { CredentialType } from './credential-types';

// ---- crypto.util unit tests ------------------------------------------------

describe('crypto.util', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    process.env = {
      ...OLD_ENV,
      CREDENTIAL_ENCRYPTION_KEY: 'a'.repeat(64),
    };
  });

  afterEach(() => {
    process.env = OLD_ENV;
  });

  it('roundtrip: encrypt → decrypt returns original plaintext', () => {
    const plain = JSON.stringify({ apiKey: 'sk-test-12345' });
    const { encryptedData, iv, authTag } = encrypt(plain);
    const result = decrypt({ encryptedData, iv, authTag });
    expect(result).toBe(plain);
  });

  it('tamper detection: flipping one byte in authTag throws', () => {
    const plain = 'hello world';
    const { encryptedData, iv, authTag } = encrypt(plain);
    const tampered = Buffer.from(authTag);
    tampered[0] ^= 0xff;
    expect(() => decrypt({ encryptedData, iv, authTag: tampered })).toThrow();
  });

  it('tamper detection: modifying ciphertext throws', () => {
    const plain = 'secret data';
    const { encryptedData, iv, authTag } = encrypt(plain);
    const tampered = Buffer.from(encryptedData);
    tampered[0] ^= 0x01;
    expect(() => decrypt({ encryptedData: tampered, iv, authTag })).toThrow();
  });

  it('each call produces a different IV (nonce uniqueness)', () => {
    const plain = 'same plaintext';
    const r1 = encrypt(plain);
    const r2 = encrypt(plain);
    expect(Buffer.from(r1.iv).equals(Buffer.from(r2.iv))).toBe(false);
  });
});

// ---- CredentialsService unit tests -----------------------------------------

const makeFakeCredential = (overrides: Partial<any> = {}) => {
  const plain = JSON.stringify({ apiKey: 'sk-secret-key' });
  const { encryptedData, iv, authTag } = encrypt(plain);
  return {
    id: 'cred-uuid-1',
    tenantId: 'tenant-1',
    name: 'My OpenAI Key',
    credentialType: CredentialType.OPENAI,
    encryptedData,
    iv,
    authTag,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
};

describe('CredentialsService', () => {
  let service: CredentialsService;
  let prisma: jest.Mocked<PrismaService>;

  const OLD_ENV = process.env;

  beforeEach(async () => {
    process.env = {
      ...OLD_ENV,
      CREDENTIAL_ENCRYPTION_KEY: 'b'.repeat(64),
    };

    const prismaMock = {
      credential: {
        count: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CredentialsService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<CredentialsService>(CredentialsService);
    prisma = module.get(PrismaService);
  });

  afterEach(() => {
    process.env = OLD_ENV;
    jest.clearAllMocks();
  });

  // --- create ---------------------------------------------------------------

  describe('create', () => {
    it('returns masked response on success', async () => {
      (prisma.credential.count as jest.Mock).mockResolvedValue(0);
      const stored = makeFakeCredential();
      (prisma.credential.create as jest.Mock).mockResolvedValue(stored);

      const result = await service.create('tenant-1', {
        name: 'My OpenAI Key',
        credentialType: CredentialType.OPENAI,
        data: { apiKey: 'sk-secret-key' },
      });

      expect(result.maskedPreview).toMatch(/\*+/);
      expect((result as any).data).toBeUndefined();
      expect((result as any).encryptedData).toBeUndefined();
    });

    it('throws ForbiddenException when cap reached', async () => {
      (prisma.credential.count as jest.Mock).mockResolvedValue(50);
      await expect(
        service.create('tenant-1', {
          name: 'Extra',
          credentialType: CredentialType.OPENAI,
          data: { apiKey: 'k' },
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('throws BadRequestException for unknown credential type', async () => {
      (prisma.credential.count as jest.Mock).mockResolvedValue(0);
      await expect(
        service.create('tenant-1', {
          name: 'Bad',
          credentialType: 'unknown_type' as CredentialType,
          data: { apiKey: 'k' },
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws BadRequestException for missing required fields', async () => {
      (prisma.credential.count as jest.Mock).mockResolvedValue(0);
      await expect(
        service.create('tenant-1', {
          name: 'Missing fields',
          credentialType: CredentialType.OPENAI,
          data: {} as any,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('re-throws ConflictException on Prisma P2002', async () => {
      (prisma.credential.count as jest.Mock).mockResolvedValue(0);
      (prisma.credential.create as jest.Mock).mockRejectedValue({ code: 'P2002' });
      await expect(
        service.create('tenant-1', {
          name: 'Duplicate',
          credentialType: CredentialType.OPENAI,
          data: { apiKey: 'k' },
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  // --- findAll / findOne ----------------------------------------------------

  describe('findAll', () => {
    it('returns array of masked credentials', async () => {
      (prisma.credential.findMany as jest.Mock).mockResolvedValue([makeFakeCredential()]);
      const results = await service.findAll('tenant-1');
      expect(Array.isArray(results)).toBe(true);
      expect((results[0] as any).encryptedData).toBeUndefined();
    });
  });

  describe('findOne', () => {
    it('throws NotFoundException when credential missing', async () => {
      (prisma.credential.findFirst as jest.Mock).mockResolvedValue(null);
      await expect(service.findOne('tenant-1', 'bad-id')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  // --- bulkDecrypt tenant isolation -----------------------------------------

  describe('bulkDecrypt', () => {
    it('returns decrypted data for owned credentials', async () => {
      const cred = makeFakeCredential();
      (prisma.credential.findMany as jest.Mock).mockResolvedValue([cred]);
      const result = await service.bulkDecrypt([cred.id], 'tenant-1');
      expect(result[cred.id]).toBeDefined();
      expect(result[cred.id].apiKey).toBe('sk-secret-key');
    });

    it('throws ForbiddenException when a credential belongs to a different tenant', async () => {
      // findMany returns fewer results than requested → ownership violation
      (prisma.credential.findMany as jest.Mock).mockResolvedValue([]);
      await expect(
        service.bulkDecrypt(['foreign-cred-id'], 'tenant-1'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('returns empty object for empty ids array', async () => {
      const result = await service.bulkDecrypt([], 'tenant-1');
      expect(result).toEqual({});
      expect(prisma.credential.findMany).not.toHaveBeenCalled();
    });
  });

  // --- remove ---------------------------------------------------------------

  describe('remove', () => {
    it('returns { deleted: true } on success', async () => {
      const cred = makeFakeCredential();
      (prisma.credential.findFirst as jest.Mock).mockResolvedValue(cred);
      (prisma.credential.delete as jest.Mock).mockResolvedValue(cred);
      const result = await service.remove('tenant-1', cred.id);
      expect(result).toEqual({ deleted: true });
    });

    it('throws NotFoundException when credential not found', async () => {
      (prisma.credential.findFirst as jest.Mock).mockResolvedValue(null);
      await expect(service.remove('tenant-1', 'bad-id')).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
