import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class StorageService {
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly logger = new Logger(StorageService.name);

  constructor(private readonly configService: ConfigService) {
    this.s3 = new S3Client({
      endpoint: this.configService.get<string>('minio.serviceUrl', 'https://voice-storage.vnpt.vn'),
      region: this.configService.get<string>('minio.region', 'us-east-1'),
      credentials: {
        accessKeyId: this.configService.get<string>('minio.accessKey', 'texttospeech'),
        secretAccessKey: this.configService.get<string>('minio.secretKey', 'Text2speechVnptAI@2024'),
      },
      forcePathStyle: true,
    });
    this.bucket = this.configService.get<string>('minio.folderName', 'smartbot-v2');
  }

  async upload(
    file: Express.Multer.File,
    folder: string = 'documents',
  ): Promise<string> {
    const key = `${folder}/${uuidv4()}/${file.originalname}`;

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    this.logger.log(`Uploaded file to S3: ${key}`);
    return key;
  }

  async delete(key: string): Promise<void> {
    await this.s3.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
    this.logger.log(`Deleted file from S3: ${key}`);
  }

  async getSignedUrl(key: string, expiresIn = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    return getSignedUrl(this.s3, command, { expiresIn });
  }
}
