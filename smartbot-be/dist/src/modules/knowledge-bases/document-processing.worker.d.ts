import { WorkerHost } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';
export declare class DocumentProcessingWorker extends WorkerHost {
    private readonly configService;
    private readonly logger;
    private readonly aiEngineUrl;
    private readonly internalApiKey;
    constructor(configService: ConfigService);
    process(job: Job): Promise<void>;
}
