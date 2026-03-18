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
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateDocumentStatusDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const PROCESSING_STATUSES = ['extracting', 'chunking', 'embedding'];
class UpdateDocumentStatusDto {
    status;
    processingStep;
    processingProgress;
    errorMessage;
    charCount;
    chunkCount;
    markdownStoragePath;
    metadata;
}
exports.UpdateDocumentStatusDto = UpdateDocumentStatusDto;
__decorate([
    (0, swagger_1.ApiProperty)({ enum: ['pending', 'processing', 'completed', 'error'] }),
    (0, class_validator_1.IsString)(),
    (0, class_transformer_1.Transform)(({ value }) => PROCESSING_STATUSES.includes(value) ? 'processing' : value),
    (0, class_validator_1.IsIn)(['pending', 'processing', 'completed', 'error']),
    __metadata("design:type", String)
], UpdateDocumentStatusDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: ['extracting', 'chunking', 'embedding'] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateDocumentStatusDto.prototype, "processingStep", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ minimum: 0, maximum: 100 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], UpdateDocumentStatusDto.prototype, "processingProgress", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateDocumentStatusDto.prototype, "errorMessage", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], UpdateDocumentStatusDto.prototype, "charCount", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], UpdateDocumentStatusDto.prototype, "chunkCount", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateDocumentStatusDto.prototype, "markdownStoragePath", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Extraction metadata from AI Engine (pages, language, etc.)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], UpdateDocumentStatusDto.prototype, "metadata", void 0);
//# sourceMappingURL=update-document-status.dto.js.map