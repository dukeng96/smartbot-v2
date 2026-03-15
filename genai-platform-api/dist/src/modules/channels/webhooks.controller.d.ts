export declare class WebhooksController {
    private readonly logger;
    facebookVerify(mode: string, verifyToken: string, challenge: string): string;
    facebookWebhook(body: Record<string, any>): {
        status: string;
    };
    telegramWebhook(body: Record<string, any>): {
        ok: boolean;
    };
    zaloWebhook(body: Record<string, any>): {
        error: number;
        message: string;
    };
}
