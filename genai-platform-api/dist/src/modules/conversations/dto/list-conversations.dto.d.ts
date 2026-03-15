import { PaginationDto } from '../../../common/dto/pagination.dto';
export declare class ListConversationsDto extends PaginationDto {
    channel?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
}
