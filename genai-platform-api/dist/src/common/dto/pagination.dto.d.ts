export declare class PaginationDto {
    page: number;
    limit: number;
    sort: string;
    order: 'asc' | 'desc';
    get skip(): number;
}
export declare class PaginatedResult<T> {
    data: T[];
    meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
    constructor(data: T[], total: number, page: number, limit: number);
}
