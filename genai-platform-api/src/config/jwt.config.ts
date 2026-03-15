import { registerAs } from '@nestjs/config';

export default registerAs('jwt', () => ({
  secret: process.env.JWT_SECRET || 'dev-secret-key-min-32-chars',
  accessTtl: parseInt(process.env.JWT_ACCESS_TTL || '900', 10),
  refreshTtl: parseInt(process.env.JWT_REFRESH_TTL || '604800', 10),
}));
