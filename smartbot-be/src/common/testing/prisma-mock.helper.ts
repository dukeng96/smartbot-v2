/**
 * Shared PrismaService mock factory for unit tests.
 * Creates a deeply-mocked PrismaService with jest.fn() on every model method.
 */
export function createPrismaMock() {
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

  const mock: Record<string, any> = {
    $transaction: jest.fn((cb: any) => cb(mock)),
  };

  for (const model of models) {
    mock[model] = {};
    for (const method of modelMethods) {
      mock[model][method] = jest.fn();
    }
  }

  return mock;
}
