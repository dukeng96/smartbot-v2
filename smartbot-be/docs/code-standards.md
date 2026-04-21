# Code Standards & Conventions

## File Organization

### Directory Structure
```
src/
├── common/                     # Shared infrastructure
│   ├── decorators/            # Custom decorators (@CurrentUser, @Public, etc.)
│   ├── dto/                   # Shared DTOs (PaginationDto)
│   ├── filters/               # Global exception filter
│   ├── guards/                # Auth/tenant/quota guards
│   ├── interceptors/          # Response transformation
│   ├── prisma/                # Database service
│   └── utils/                 # Utility functions (crypto, slug)
├── config/                     # Configuration loaders (app, jwt, s3, etc.)
├── modules/                    # Feature modules (auth, bots, etc.)
│   └── {module}/
│       ├── {feature}.controller.ts    # HTTP endpoints
│       ├── {feature}.service.ts       # Business logic
│       ├── {feature}.module.ts        # Module definition
│       ├── dto/                       # Data transfer objects
│       ├── entities/                  # Type definitions (optional)
│       └── {feature}.spec.ts          # Unit tests
├── app.controller.ts           # Health check endpoint
├── app.module.ts               # Root module
└── main.ts                     # Server bootstrap
```

### Module File Naming
- Controller: `{feature}.controller.ts`
- Service: `{feature}.service.ts`
- Module: `{feature}.module.ts`
- DTO: `dto/{action}.dto.ts` (create, update, login, etc.)
- Tests: `{feature}.spec.ts` (colocated with implementation)

**Example (Bots):**
```
bots/
├── bots.controller.ts
├── bots.service.ts
├── bots.module.ts
├── bots.spec.ts
└── dto/
    ├── create-bot.dto.ts
    ├── update-bot.dto.ts
    ├── update-personality.dto.ts
    └── attach-knowledge-base.dto.ts
```

## Coding Patterns

### Module Definition
```typescript
// Pattern: Use forFeature() for Prisma, import guards/services
@Module({
  imports: [PrismaModule],
  controllers: [BotsController],
  providers: [BotsService],
  exports: [BotsService], // If needed by other modules
})
export class BotsModule {}
```

### Service Pattern
```typescript
@Injectable()
export class BotsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateBotDto) {
    // Validate quota before creating
    const botCount = await this.prisma.bot.count({ where: { tenantId } });
    if (botCount >= maxBots) {
      throw new BadRequestException('Bot quota exceeded');
    }

    // Use transactions for multi-step operations
    return await this.prisma.$transaction(async (tx) => {
      const bot = await tx.bot.create({
        data: {
          tenantId,
          name: dto.name,
          description: dto.description,
          systemPrompt: dto.systemPrompt,
        },
      });
      return bot;
    });
  }

  async update(tenantId: string, botId: string, dto: UpdateBotDto) {
    // Verify ownership before updating
    const bot = await this.getBot(tenantId, botId);
    if (!bot) throw new NotFoundException('Bot not found');

    return await this.prisma.bot.update({
      where: { id: botId },
      data: { ...dto },
    });
  }

  private async getBot(tenantId: string, botId: string) {
    // Always filter by tenantId for data isolation
    return await this.prisma.bot.findFirst({
      where: { id: botId, tenantId },
    });
  }
}
```

### Controller Pattern
```typescript
@ApiTags('Bots')
@Controller('api/v1/bots')
export class BotsController {
  constructor(private readonly botsService: BotsService) {}

  @Post()
  @ApiOperation({ summary: 'Create bot in current tenant' })
  create(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateBotDto,
  ) {
    return this.botsService.create(tenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List bots in current tenant' })
  list(@CurrentTenant() tenantId: string) {
    return this.botsService.list(tenantId);
  }

  @Patch(':botId')
  @ApiOperation({ summary: 'Update bot configuration' })
  update(
    @CurrentTenant() tenantId: string,
    @Param('botId') botId: string,
    @Body() dto: UpdateBotDto,
  ) {
    return this.botsService.update(tenantId, botId, dto);
  }
}
```

### DTO Pattern
```typescript
import { IsString, IsOptional, IsInt, Min, Max, IsJson } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateBotDto {
  @ApiProperty({ example: 'My Assistant', description: 'Display name' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ example: 'Helps with customer support' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 5, description: 'Top-K documents to retrieve' })
  @IsInt()
  @Min(1)
  @Max(20)
  @IsOptional()
  topK?: number;

  @ApiProperty({ example: '{ "tone": "friendly" }' })
  @IsJson()
  @IsOptional()
  personality?: Record<string, unknown>;
}
```

### Guard Pattern (Multi-Tenant)
```typescript
@Injectable()
export class TenantGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Skip public endpoints
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user?.tenantId) {
      throw new ForbiddenException('No tenant context');
    }

    // Verify membership
    const membership = await this.prisma.tenantMember.findUnique({
      where: { tenantId_userId: { tenantId: user.tenantId, userId: user.userId } },
    });

    if (!membership?.active) {
      throw new ForbiddenException('Not a member of this tenant');
    }

    // Attach to request
    request.tenantId = user.tenantId;
    request.tenantRole = membership.role;
    return true;
  }
}
```

### Decorator Pattern
```typescript
// Usage in controllers
@CurrentTenant() tenantId: string
@CurrentUser() user: JwtPayload

// Implementation
export const CurrentTenant = createParamDecorator(
  (data, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest();
    return request.tenantId;
  },
);
```

## Naming Conventions

### TypeScript Variables & Functions
- **camelCase:** `userId`, `getTenantById()`, `createBotService`
- **Constants:** `UPPERCASE_SNAKE_CASE` — `MAX_BOTS = 50`
- **Enums:** `PascalCase` — `enum BotStatus { DRAFT, PUBLISHED }`
- **Classes/Interfaces:** `PascalCase` — `BotsService`, `CreateBotDto`

### Database
- **Table names:** `snake_case` — `knowledge_bases`, `bot_knowledge_bases`
- **Column names:** `snake_case` — `user_id`, `created_at`, `is_active`
- **Foreign keys:** `{table_singular}_{primary_key}` — `user_id`, `bot_id`
- **Indexes:** Descriptive, use Prisma `@@index([field])`

### API Routes
- **Verbs:** RESTful (`GET /users`, `POST /bots`, `PATCH /bots/:id`, `DELETE /bots/:id`)
- **Resources:** Plural nouns — `/bots`, `/knowledge-bases`, `/conversations`
- **Nested:** Up to 2 levels — `/bots/:botId/knowledge-bases`
- **Versions:** In path — `/api/v1/`
- **Special:** Query params for filters — `?status=active&limit=10`

**API Routes Summary:**
| Resource | Endpoint | Method | Auth |
|----------|----------|--------|------|
| Auth | `/api/v1/auth/register` | POST | Public |
| Auth | `/api/v1/auth/login` | POST | Public |
| Bots | `/api/v1/bots` | GET | JWT |
| Bots | `/api/v1/bots` | POST | JWT |
| Bots | `/api/v1/bots/:botId` | PATCH | JWT |
| Chat | `/api/v1/chat/proxy` | GET (SSE) | BotApiKey |

## Error Handling

### Service Layer
```typescript
// Use NestJS exceptions
throw new BadRequestException('Message must not be empty');
throw new NotFoundException('Bot not found');
throw new ForbiddenException('Insufficient permissions');
throw new ConflictException('Email already in use');
throw new InternalServerErrorException('Database error');
```

### HTTP Status Mapping
| Exception | Status | Use Case |
|-----------|--------|----------|
| BadRequestException | 400 | Validation failed, quota exceeded |
| UnauthorizedException | 401 | Invalid JWT, missing token |
| ForbiddenException | 403 | Access denied, wrong tenant |
| NotFoundException | 404 | Resource not found |
| ConflictException | 409 | Unique constraint violated |
| InternalServerErrorException | 500 | Unexpected server error |

### Global Error Filter
```typescript
// All exceptions caught, formatted consistently
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = 500;
    let message = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      message = exception.getResponse()['message'] || message;
    }

    response.status(status).json({
      statusCode: status,
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
```

## Data Validation

### Input Validation
```typescript
// DTOs use class-validator decorators
export class CreateBotDto {
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  name: string;

  @IsEmail()
  email?: string;

  @IsEnum(['draft', 'published', 'archived'])
  status?: string;

  @IsInt()
  @Min(1)
  @Max(20)
  topK?: number;
}

// Global ValidationPipe in main.ts
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,              // Strip unknown properties
    forbidNonWhitelisted: true,   // Reject unknown properties
    transform: true,              // Auto-convert types
    transformOptions: { enableImplicitConversion: true },
  }),
);
```

### Database Constraints
- **Unique:** Email on User, slug on Tenant
- **Not Null:** Key fields (id, tenantId, botId, etc.)
- **Foreign Keys:** Cascade delete for tenant-scoped resources
- **Enums:** status, role, channel type (enforced in application)

## Testing Standards

### Unit Test Pattern
```typescript
describe('BotsService', () => {
  let service: BotsService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        BotsService,
        { provide: PrismaService, useValue: { bot: { create: jest.fn() } } },
      ],
    }).compile();

    service = module.get<BotsService>(BotsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should create a bot', async () => {
    const tenantId = 'tenant-123';
    const dto = { name: 'Test Bot' };

    jest.spyOn(prisma.bot, 'create').mockResolvedValue({
      id: 'bot-1',
      tenantId,
      ...dto,
    });

    const result = await service.create(tenantId, dto);
    expect(result.id).toBe('bot-1');
  });

  it('should throw on quota exceeded', async () => {
    // Mock reaching bot limit
    jest.spyOn(prisma.bot, 'count').mockResolvedValue(50);

    await expect(
      service.create('tenant-123', { name: 'Test' }),
    ).rejects.toThrow('Bot quota exceeded');
  });
});
```

### Integration Test Pattern
```typescript
describe('BotsController (Integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    prisma = moduleFixture.get<PrismaService>(PrismaService);
  });

  it('POST /bots should create bot', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/bots')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'New Bot', systemPrompt: 'You are helpful' })
      .expect(201);

    expect(response.body.data.id).toBeDefined();
  });
});
```

### Coverage Requirements
- **Target:** 80%+ coverage
- **Critical paths:** Auth, quota checks, data isolation
- **Happy paths:** Main CRUD operations
- **Error paths:** Validation, not found, forbidden

## Transaction & Consistency

### Database Transactions
```typescript
// Use $transaction for atomic multi-step operations
await this.prisma.$transaction(async (tx) => {
  // Step 1: Create bot
  const bot = await tx.bot.create({ data: {...} });

  // Step 2: Link knowledge base
  await tx.botKnowledgeBase.create({
    data: {
      botId: bot.id,
      knowledgeBaseId: kbId,
    },
  });

  return bot;
});

// If any step fails, entire transaction rolls back
```

### Idempotency
- POST (create) — No idempotency required (fails on conflict)
- PATCH (update) — Safe to retry (last write wins)
- DELETE (delete) — Safe to retry (soft delete or 404 on retry)

## Comment Standards

### Code Comments
```typescript
// Bad: Comment states what code does
const x = y + 1; // Add 1 to y

// Good: Comment explains why
const nextTurnCount = currentTurns + 1; // Account for zero-indexed offset

// Good: Complex algorithm gets step-by-step comments
// 1. Sort messages by creation date
// 2. Take last N turns
// 3. Format for AI Engine consumption
const history = messages
  .sort((a, b) => a.createdAt - b.createdAt)
  .slice(-this.memoryTurns);
```

### JSDoc for Public APIs
```typescript
/**
 * Create a new bot in the tenant's workspace.
 *
 * @param tenantId - The tenant identifier
 * @param dto - Bot creation payload
 * @returns The created bot with id and metadata
 * @throws BadRequestException if quota exceeded
 * @throws NotFoundException if tenant not found
 */
async create(tenantId: string, dto: CreateBotDto): Promise<Bot> {
  // ...
}
```

## Security Standards

### Secrets Management
- ✅ All secrets in `.env` (never `.env.example`)
- ✅ Config loaders read from environment
- ✅ No hardcoded URLs, API keys, or passwords
- ✅ `INTERNAL_API_KEY` for AI Engine callbacks (secure header)

### Authentication
- ✅ JWT in `Authorization: Bearer <token>` header
- ✅ Bot API keys in `X-Bot-Api-Key` header
- ✅ Both hashed before storage
- ✅ Token validation in JWT strategy

### Data Isolation
- ✅ All queries filtered by `tenantId`
- ✅ Guards verify tenant membership
- ✅ Foreign key constraints prevent cross-tenant access
- ✅ No user can see data from other tenants

### Input Validation
- ✅ DTOs validate all inputs
- ✅ Whitelist mode (reject unknown properties)
- ✅ Length/format constraints
- ✅ Enum validation for fixed values

## Logging Standards

### Log Levels
- **ERROR:** Exceptions, system failures
- **WARN:** Quota warnings, deprecated usage
- **LOG:** Important business events (bot created, subscription started)
- **DEBUG:** Detailed diagnostic info (query timing, cache hits)

### Structured Logging (Future)
```typescript
// Current: Simple logger
this.logger.log(`Bot ${botId} created by tenant ${tenantId}`);

// Future: Structured
this.logger.log({
  event: 'bot.created',
  botId,
  tenantId,
  timestamp: new Date(),
  userId,
});
```

## Performance Considerations

### Database Indexes
- Composite indexes on (tenantId, field) for multi-tenant queries
- (createdAt DESC) for ordering
- (status) for filtering
- Foreign key columns auto-indexed by Prisma

### Query Optimization
```typescript
// Bad: N+1 query problem
const bots = await this.prisma.bot.findMany({ where: { tenantId } });
for (const bot of bots) {
  bot.kbs = await this.prisma.botKnowledgeBase.findMany({ where: { botId: bot.id } });
}

// Good: Load related data in single query
const bots = await this.prisma.bot.findMany({
  where: { tenantId },
  include: {
    knowledgeBases: {
      include: { knowledgeBase: true },
      orderBy: { priority: 'desc' },
    },
  },
});
```

### Pagination
```typescript
// Default: limit 50, skip 0
@Query(PaginationDto) pagination: PaginationDto,

const { skip, limit } = pagination;
const items = await this.prisma.{table}.findMany({
  where: { tenantId },
  skip: skip * limit,
  take: limit,
});
```

## Dependency Injection Pattern

```typescript
// Modules declare what they provide
@Module({
  imports: [PrismaModule, StorageModule],
  providers: [BotsService],
  exports: [BotsService],
})
export class BotsModule {}

// Services declare what they need
@Injectable()
export class BotsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}
}

// Controllers declare what they need
@Controller('bots')
export class BotsController {
  constructor(
    private readonly botsService: BotsService,
  ) {}
}
```

## Configuration Management

### Environment Variables
```typescript
// src/config/app.config.ts
export const appConfig = () => ({
  app: {
    url: process.env.APP_URL || 'http://localhost:3000',
    port: parseInt(process.env.PORT || '3000', 10),
    env: process.env.NODE_ENV || 'development',
  },
});

// Usage in service
constructor(private configService: ConfigService) {}

const appUrl = this.configService.get<string>('app.url');
```

## Refactoring Guidelines

### When to Extract
- Function > 50 lines
- File > 200 lines
- Repeated logic (DRY violation)
- Single responsibility violated

### File Size Targets
- Controllers: 100-200 lines
- Services: 150-300 lines (break large services into multi-service module)
- DTOs: 20-50 lines
- Guards/interceptors: 30-60 lines
