declare const _default: (() => {
    endpoint: string;
    accessKey: string;
    secretKey: string;
    bucket: string;
    region: string;
}) & import("@nestjs/config").ConfigFactoryKeyHost<{
    endpoint: string;
    accessKey: string;
    secretKey: string;
    bucket: string;
    region: string;
}>;
export default _default;
