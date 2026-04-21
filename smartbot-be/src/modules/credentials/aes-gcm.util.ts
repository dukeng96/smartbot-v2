import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  timingSafeEqual,
} from 'crypto';

const ALG = 'aes-256-gcm';
const KEY_HEX_LENGTH = 64; // 32 bytes = 64 hex chars

export function getEncryptionKey(): Buffer {
  const hex = process.env.CREDENTIAL_ENCRYPTION_KEY;
  if (!hex || hex.length !== KEY_HEX_LENGTH) {
    throw new Error(
      'CREDENTIAL_ENCRYPTION_KEY must be a 64-char hex string (32 bytes)',
    );
  }
  return Buffer.from(hex, 'hex');
}

export interface EncryptResult {
  // Typed as Uint8Array<ArrayBuffer> to match Prisma Bytes input type.
  encryptedData: Uint8Array<ArrayBuffer>;
  iv: Uint8Array<ArrayBuffer>;
  authTag: Uint8Array<ArrayBuffer>;
}

function toUint8Array(buf: Buffer): Uint8Array<ArrayBuffer> {
  // Copy into a fresh ArrayBuffer to satisfy strict Prisma Bytes type.
  const ab = new ArrayBuffer(buf.byteLength);
  new Uint8Array(ab).set(buf);
  return new Uint8Array(ab) as Uint8Array<ArrayBuffer>;
}

export function encrypt(plaintext: string): EncryptResult {
  const key = getEncryptionKey();
  const iv = randomBytes(12); // 96-bit nonce for GCM
  const cipher = createCipheriv(ALG, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag(); // 16-byte GCM authentication tag
  return {
    encryptedData: toUint8Array(encrypted),
    iv: toUint8Array(iv),
    authTag: toUint8Array(authTag),
  };
}

export function decrypt(params: {
  encryptedData: Buffer | Uint8Array;
  iv: Buffer | Uint8Array;
  authTag: Buffer | Uint8Array;
}): string {
  const key = getEncryptionKey();
  const decipher = createDecipheriv(ALG, key, Buffer.from(params.iv));
  decipher.setAuthTag(Buffer.from(params.authTag));
  // Throws if tag verification fails — tamper detected
  return Buffer.concat([
    decipher.update(Buffer.from(params.encryptedData)),
    decipher.final(),
  ]).toString('utf8');
}

export function maskSecret(secret: string): string {
  if (secret.length <= 8) return '****';
  return `${secret.slice(0, 4)}****${secret.slice(-4)}`;
}

export function verifyAuthTag(a: Buffer, b: Buffer): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
