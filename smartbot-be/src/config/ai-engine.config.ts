import { registerAs } from '@nestjs/config';

export default registerAs('aiEngine', () => ({
  url: process.env.AI_ENGINE_URL || 'http://localhost:8000',
  internalApiKey: process.env.INTERNAL_API_KEY || 'internal-secret-key',
}));
