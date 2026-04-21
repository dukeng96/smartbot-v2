"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPrismaMock = createPrismaMock;
function createPrismaMock() {
    const modelMethods = [
        'findUnique',
        'findFirst',
        'findMany',
        'create',
        'createMany',
        'update',
        'updateMany',
        'delete',
        'deleteMany',
        'count',
        'aggregate',
        'upsert',
    ];
    const models = [
        'user',
        'refreshToken',
        'tenant',
        'tenantMember',
        'bot',
        'botKnowledgeBase',
        'knowledgeBase',
        'document',
        'conversation',
        'message',
        'channel',
        'plan',
        'subscription',
        'creditUsage',
        'paymentHistory',
    ];
    const mock = {
        $transaction: jest.fn((cb) => cb(mock)),
    };
    for (const model of models) {
        mock[model] = {};
        for (const method of modelMethods) {
            mock[model][method] = jest.fn();
        }
    }
    return mock;
}
//# sourceMappingURL=prisma-mock.helper.js.map