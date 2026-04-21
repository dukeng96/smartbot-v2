"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("@nestjs/config");
exports.default = (0, config_1.registerAs)('minio', () => ({
    serviceUrl: process.env.MINIO_SERVICE_URL || 'https://voice-storage.vnpt.vn',
    accessKey: process.env.MINIO_ACCESS_KEY || 'texttospeech',
    secretKey: process.env.MINIO_SECRET_KEY || 'Text2speechVnptAI@2024',
    folderName: process.env.MINIO_FOLDER_NAME || 'smartbot-v2',
    region: process.env.MINIO_REGION || 'us-east-1',
}));
//# sourceMappingURL=minio.config.js.map