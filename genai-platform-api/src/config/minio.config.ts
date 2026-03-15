import { registerAs } from '@nestjs/config';

export default registerAs('minio', () => ({
  serviceUrl: process.env.MINIO_SERVICE_URL || 'https://voice-storage.vnpt.vn',
  accessKey: process.env.MINIO_ACCESS_KEY || 'texttospeech',
  secretKey: process.env.MINIO_SECRET_KEY || 'Text2speechVnptAI@2024',
  folderName: process.env.MINIO_FOLDER_NAME || 'smartbot-v2',
  region: process.env.MINIO_REGION || 'us-east-1',
}));
