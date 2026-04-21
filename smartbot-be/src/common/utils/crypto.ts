import * as crypto from 'crypto';

export function generateApiKey(): string {
  return `sk_${crypto.randomBytes(32).toString('hex')}`;
}

export function hashApiKey(apiKey: string): string {
  return crypto.createHash('sha256').update(apiKey).digest('hex');
}

export function generateToken(length = 48): string {
  return crypto.randomBytes(length).toString('hex');
}

export function getApiKeyPrefix(apiKey: string): string {
  return apiKey.substring(0, 8);
}
