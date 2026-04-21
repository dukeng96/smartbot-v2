export interface JwtPayload {
    userId: string;
    tenantId: string;
    role: string;
    iat: number;
    exp: number;
}
export declare const CurrentUser: (...dataOrPipes: (keyof JwtPayload | import("@nestjs/common").PipeTransform<any, any> | import("@nestjs/common").Type<import("@nestjs/common").PipeTransform<any, any>> | undefined)[]) => ParameterDecorator;
