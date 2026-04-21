import { DocumentsService } from './documents.service';
import { UpdateDocumentStatusDto } from './dto/update-document-status.dto';
export declare class InternalDocumentsController {
    private readonly documentsService;
    constructor(documentsService: DocumentsService);
    updateStatus(id: string, dto: UpdateDocumentStatusDto): Promise<{
        message: string;
    }>;
}
