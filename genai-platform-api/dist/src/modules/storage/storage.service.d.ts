import { ConfigService } from '@nestjs/config';
export declare class StorageService {
    private readonly configService;
    private readonly s3;
    private readonly bucket;
    private readonly logger;
    constructor(configService: ConfigService);
    upload(file: Express.Multer.File, folder?: string): Promise<string>;
    delete(key: string): Promise<void>;
    getSignedUrl(key: string, expiresIn?: number): Promise<string>;
}
