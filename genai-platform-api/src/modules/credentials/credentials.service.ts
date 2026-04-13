import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { encrypt, decrypt, maskSecret } from './crypto.util';
import {
  CREDENTIAL_CAP_PER_TENANT,
  CREDENTIAL_SCHEMA,
  CredentialType,
} from './credential-types';
import { CreateCredentialDto } from './dto/create-credential.dto';
import { UpdateCredentialDto } from './dto/update-credential.dto';
import { CredentialResponseDto } from './dto/credential-response.dto';

@Injectable()
export class CredentialsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    tenantId: string,
    dto: CreateCredentialDto,
  ): Promise<CredentialResponseDto> {
    const count = await this.prisma.credential.count({ where: { tenantId } });
    if (count >= CREDENTIAL_CAP_PER_TENANT) {
      throw new ForbiddenException(
        `Credential limit reached (${CREDENTIAL_CAP_PER_TENANT} per tenant). Delete unused credentials first.`,
      );
    }

    this.validateCredentialData(dto.credentialType as CredentialType, dto.data);

    const plaintext = JSON.stringify(dto.data);
    const { encryptedData, iv, authTag } = encrypt(plaintext);

    try {
      const credential = await this.prisma.credential.create({
        data: {
          tenantId,
          name: dto.name,
          credentialType: dto.credentialType,
          encryptedData,
          iv,
          authTag,
        },
      });
      return this.toResponse(credential, dto.data);
    } catch (e: any) {
      if (e.code === 'P2002') {
        throw new ConflictException(
          `Credential name '${dto.name}' already exists`,
        );
      }
      throw e;
    }
  }

  async findAll(tenantId: string): Promise<CredentialResponseDto[]> {
    const credentials = await this.prisma.credential.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
    return credentials.map((c) => this.toResponseMasked(c));
  }

  async findOne(tenantId: string, id: string): Promise<CredentialResponseDto> {
    const credential = await this.prisma.credential.findFirst({
      where: { id, tenantId },
    });
    if (!credential) throw new NotFoundException('Credential not found');
    return this.toResponseMasked(credential);
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateCredentialDto,
  ): Promise<CredentialResponseDto> {
    const existing = await this.prisma.credential.findFirst({
      where: { id, tenantId },
    });
    if (!existing) throw new NotFoundException('Credential not found');

    const updateData: any = {};

    if (dto.name !== undefined) {
      updateData.name = dto.name;
    }

    if (dto.data !== undefined) {
      this.validateCredentialData(
        existing.credentialType as CredentialType,
        dto.data,
      );
      const plaintext = JSON.stringify(dto.data);
      const { encryptedData, iv, authTag } = encrypt(plaintext);
      updateData.encryptedData = encryptedData as unknown as Uint8Array;
      updateData.iv = iv as unknown as Uint8Array;
      updateData.authTag = authTag as unknown as Uint8Array;
    }

    try {
      const updated = await this.prisma.credential.update({
        where: { id },
        data: updateData,
      });

      const previewData = dto.data ?? this.decryptToObject(existing);
      return this.toResponse(updated, previewData);
    } catch (e: any) {
      if (e.code === 'P2002') {
        throw new ConflictException(
          `Credential name '${dto.name}' already exists`,
        );
      }
      throw e;
    }
  }

  async remove(tenantId: string, id: string): Promise<{ deleted: boolean }> {
    const existing = await this.prisma.credential.findFirst({
      where: { id, tenantId },
    });
    if (!existing) throw new NotFoundException('Credential not found');
    await this.prisma.credential.delete({ where: { id } });
    return { deleted: true };
  }

  async testCredential(
    tenantId: string,
    id: string,
  ): Promise<{ ok: boolean; message: string }> {
    const credential = await this.prisma.credential.findFirst({
      where: { id, tenantId },
    });
    if (!credential) throw new NotFoundException('Credential not found');

    const data = this.decryptToObject(credential);

    switch (credential.credentialType as CredentialType) {
      case CredentialType.VNPT: {
        try {
          const resp = await fetch(`${data.baseUrl}/models`, {
            method: 'GET',
            headers: { Authorization: `Bearer ${data.apiKey}` },
            signal: AbortSignal.timeout(5000),
          });
          return {
            ok: resp.ok,
            message: resp.ok ? 'Connection successful' : `HTTP ${resp.status}`,
          };
        } catch {
          return { ok: false, message: 'Connection failed' };
        }
      }
      case CredentialType.OPENAI: {
        try {
          const resp = await fetch('https://api.openai.com/v1/models', {
            method: 'GET',
            headers: { Authorization: `Bearer ${data.apiKey}` },
            signal: AbortSignal.timeout(5000),
          });
          return {
            ok: resp.ok,
            message: resp.ok ? 'Connection successful' : `HTTP ${resp.status}`,
          };
        } catch {
          return { ok: false, message: 'Connection failed' };
        }
      }
      case CredentialType.QDRANT: {
        try {
          const resp = await fetch(`${data.url}/collections`, {
            method: 'GET',
            headers: data.apiKey
              ? { 'api-key': data.apiKey }
              : {},
            signal: AbortSignal.timeout(5000),
          });
          return {
            ok: resp.ok,
            message: resp.ok ? 'Connection successful' : `HTTP ${resp.status}`,
          };
        } catch {
          return { ok: false, message: 'Connection failed' };
        }
      }
      default:
        return { ok: true, message: 'Test not implemented for this type' };
    }
  }

  // Internal — called by flow-exec module to decrypt credentials for engine dispatch.
  // Verifies tenant ownership before decrypting.
  async bulkDecrypt(
    ids: string[],
    tenantId: string,
  ): Promise<Record<string, Record<string, string>>> {
    if (ids.length === 0) return {};

    const credentials = await this.prisma.credential.findMany({
      where: { id: { in: ids }, tenantId },
    });

    if (credentials.length !== ids.length) {
      const foundIds = new Set(credentials.map((c) => c.id));
      const missing = ids.filter((id) => !foundIds.has(id));
      throw new ForbiddenException(
        `Credentials not found or access denied: ${missing.join(', ')}`,
      );
    }

    return Object.fromEntries(
      credentials.map((c) => [c.id, this.decryptToObject(c)]),
    );
  }

  // Prisma Bytes → Uint8Array at runtime; Buffer.from() ensures crypto compat.
  private decryptToObject(credential: {
    encryptedData: Uint8Array;
    iv: Uint8Array;
    authTag: Uint8Array;
  }): Record<string, string> {
    const plaintext = decrypt({
      encryptedData: Buffer.from(credential.encryptedData),
      iv: Buffer.from(credential.iv),
      authTag: Buffer.from(credential.authTag),
    });
    return JSON.parse(plaintext);
  }

  private validateCredentialData(
    type: CredentialType,
    data: Record<string, string>,
  ): void {
    const requiredFields = CREDENTIAL_SCHEMA[type];
    if (!requiredFields) {
      throw new BadRequestException(`Unknown credential type: ${type}`);
    }
    const missing = requiredFields.filter(
      (f) => !data[f] || typeof data[f] !== 'string',
    );
    if (missing.length > 0) {
      throw new BadRequestException(
        `Missing required fields for ${type}: ${missing.join(', ')}`,
      );
    }
  }

  private toResponseMasked(credential: any): CredentialResponseDto {
    // Decrypt just enough to build masked preview — first field value
    let maskedPreview = '****';
    try {
      const data = this.decryptToObject(credential);
      const firstValue = Object.values(data)[0] as string;
      maskedPreview = maskSecret(firstValue);
    } catch {
      maskedPreview = '****';
    }
    return {
      id: credential.id,
      name: credential.name,
      credentialType: credential.credentialType,
      maskedPreview,
      createdAt: credential.createdAt,
      updatedAt: credential.updatedAt,
    };
  }

  private toResponse(
    credential: any,
    data: Record<string, string>,
  ): CredentialResponseDto {
    const firstValue = Object.values(data)[0] as string;
    return {
      id: credential.id,
      name: credential.name,
      credentialType: credential.credentialType,
      maskedPreview: maskSecret(firstValue),
      createdAt: credential.createdAt,
      updatedAt: credential.updatedAt,
    };
  }
}
