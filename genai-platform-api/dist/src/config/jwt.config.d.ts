declare const _default: (() => {
    secret: string;
    accessTtl: number;
    refreshTtl: number;
}) & import("@nestjs/config").ConfigFactoryKeyHost<{
    secret: string;
    accessTtl: number;
    refreshTtl: number;
}>;
export default _default;
