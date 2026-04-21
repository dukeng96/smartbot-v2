export declare class UpdateDocumentStatusDto {
    status: string;
    processingStep?: string;
    processingProgress?: number;
    errorMessage?: string;
    charCount?: number;
    chunkCount?: number;
    markdownStoragePath?: string;
    metadata?: Record<string, any>;
}
