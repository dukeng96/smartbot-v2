"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var StorageService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const uuid_1 = require("uuid");
let StorageService = StorageService_1 = class StorageService {
    configService;
    s3;
    bucket;
    logger = new common_1.Logger(StorageService_1.name);
    constructor(configService) {
        this.configService = configService;
        this.s3 = new client_s3_1.S3Client({
            endpoint: this.configService.get('s3.endpoint', 'http://localhost:9000'),
            region: this.configService.get('s3.region', 'us-east-1'),
            credentials: {
                accessKeyId: this.configService.get('s3.accessKey', 'minioadmin'),
                secretAccessKey: this.configService.get('s3.secretKey', 'minioadmin'),
            },
            forcePathStyle: true,
        });
        this.bucket = this.configService.get('s3.bucket', 'smartbot-docs');
    }
    async upload(file, folder = 'documents') {
        const key = `${folder}/${(0, uuid_1.v4)()}/${file.originalname}`;
        await this.s3.send(new client_s3_1.PutObjectCommand({
            Bucket: this.bucket,
            Key: key,
            Body: file.buffer,
            ContentType: file.mimetype,
        }));
        this.logger.log(`Uploaded file to S3: ${key}`);
        return key;
    }
    async delete(key) {
        await this.s3.send(new client_s3_1.DeleteObjectCommand({
            Bucket: this.bucket,
            Key: key,
        }));
        this.logger.log(`Deleted file from S3: ${key}`);
    }
    async getSignedUrl(key, expiresIn = 3600) {
        const command = new client_s3_1.GetObjectCommand({
            Bucket: this.bucket,
            Key: key,
        });
        return (0, s3_request_presigner_1.getSignedUrl)(this.s3, command, { expiresIn });
    }
};
exports.StorageService = StorageService;
exports.StorageService = StorageService = StorageService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], StorageService);
//# sourceMappingURL=storage.service.js.map