# GenAI Assistant Platform — Code Standards & Guidelines

**Last Updated:** 2026-03-14

---

## Overview

This document defines coding standards, architectural patterns, and best practices for the GenAI Assistant Platform across both the NestJS backend and FastAPI engine.

**Principles:**
- YAGNI (You Aren't Gonna Need It) - avoid speculative coding
- KISS (Keep It Simple, Stupid) - prefer simple solutions
- DRY (Don't Repeat Yourself) - extract reusable code
- Clean Code - readability over cleverness
- Test-Driven Development - write tests first

---

## General Principles

### File Organization & Naming

**File Naming Convention:**
- Use `kebab-case` for all file names
- File names should be descriptive and self-documenting
- Include function/class purpose in the name

**Examples:**
```
✓ user-authentication-service.ts
✓ multi-tenant-guard.ts
✓ document-processing-pipeline.py
✓ qdrant-vector-handler.py

✗ service.ts (too generic)
✗ guard.ts (ambiguous)
✗ helper.py (meaningless)
✗ util.ts (undefined purpose)
```

**Directory Structure:**
- Organize by feature/domain, not by type
- Group related logic together

**Backend Example:**
```
src/modules/bots/
├── bots.controller.ts
├── bots.service.ts
├── bots.module.ts
├── dto/
│   ├── create-bot.dto.ts
│   ├── update-bot.dto.ts
│   └── bot-response.dto.ts
├── entities/
│   └── bot.entity.ts
└── tests/
    └── bots.service.spec.ts
```

**Engine Example:**
```
app/services/
├── document-processor.py     # Main orchestration
├── text-extractor.py         # OCR service
├── chunker.py                # Text chunking
└── embedding-service.py      # Embedding generation
```

### File Size Management

**Target:** Keep files under 200 lines for optimal code review and understanding

**When to Split:**
- Service logic >200 lines → extract smaller services
- Controller with >10 endpoints → split by feature
- Model file with >5 classes → separate by concern

**Example - Before (Too Large):**
```typescript
// bots.service.ts - 350 lines
export class BotsService {
  // CRUD operations (50 lines)
  // Personality config (40 lines)
  // Widget customization (60 lines)
  // API key generation (30 lines)
  // Embed code generation (70 lines)
  // Duplication logic (50 lines)
  // Validation (50 lines)
}
```

**Example - After (Split):**
```
bots/
├── bots-crud.service.ts        # Create, read, update, delete
├── bots-personality.service.ts # Personality config
├── bots-widget.service.ts      # Widget customization
└── bots-embed.service.ts       # Embed code generation
```

---

## Backend (NestJS) Standards

### Architecture Pattern

**Layered Architecture:**
```
Controller (HTTP request/response)
    ↓
Service (Business logic)
    ↓
Repository/Entity (Data access)
    ↓
Database
```

**Example:**
```typescript
// 1. Controller: HTTP layer
@Controller('bots')
export class BotsController {
  @Get(':id')
  async getBot(@Param('id') id: string) {
    return this.botsService.findById(id);
  }
}

// 2. Service: Business logic
@Injectable()
export class BotsService {
  async findById(id: string) {
    const bot = await this.botsRepository.findUnique({where: {id}});
    if (!bot) throw new NotFoundException();
    return bot;
  }
}

// 3. Repository: Data access (Prisma)
async findUnique(where) {
  return this.prisma.bot.findUnique({where});
}
```

### Dependency Injection

**Always use constructor injection:**

```typescript
// ✓ CORRECT
@Injectable()
export class BotService {
  constructor(private prisma: PrismaService) {}

  async findBot(id: string) {
    return this.prisma.bot.findUnique({where: {id}});
  }
}

// ✗ WRONG
export class BotService {
  private prisma = new PrismaService(); // Hardcoded dependency
}
```

### DTOs & Validation

**Always validate input with DTOs:**

```typescript
// ✓ CORRECT - with validation
export class CreateBotDto {
  @IsString()
  @Length(1, 100)
  name: string;

  @IsEnum(['draft', 'active', 'paused'])
  status: string;

  @IsObject()
  @ValidateNested()
  personality: PersonalityConfig;
}

@Post()
async create(@Body() dto: CreateBotDto) {
  // dto is validated before reaching handler
  return this.botsService.create(dto);
}

// ✗ WRONG - no validation
@Post()
async create(@Body() body: any) {
  // Dangerous - no input validation!
  return this.botsService.create(body);
}
```

### Error Handling

**Always handle errors explicitly:**

```typescript
// ✓ CORRECT - with try/catch
@Get(':id')
async getBot(@Param('id') id: string) {
  try {
    const bot = await this.botsService.findById(id);
    if (!bot) {
      throw new NotFoundException('Bot not found');
    }
    return bot;
  } catch (error) {
    this.logger.error('Failed to get bot', {id, error});
    if (error instanceof NotFoundException) {
      throw error; // Rethrow known errors
    }
    throw new InternalServerErrorException('Failed to retrieve bot');
  }
}

// ✗ WRONG - swallows errors
async getBot(@Param('id') id: string) {
  return this.botsService.findById(id); // No error handling!
}
```

**Custom Exception Filters:**
```typescript
@Catch(NotFoundException)
export class NotFoundExceptionFilter implements ExceptionFilter {
  catch(exception: NotFoundException, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse();
    response.status(404).json({
      statusCode: 404,
      message: exception.getResponse(),
      error: 'Not Found'
    });
  }
}
```

### Database Patterns

**Use Prisma transactions for multi-step operations:**

```typescript
// ✓ CORRECT - atomic transaction
async createBotWithKnowledgeBases(
  createBotDto: CreateBotDto,
  kbIds: string[]
) {
  return this.prisma.$transaction(async (tx) => {
    const bot = await tx.bot.create({data: createBotDto});

    await Promise.all(kbIds.map(kbId =>
      tx.botKnowledgeBase.create({
        data: {botId: bot.id, knowledgeBaseId: kbId}
      })
    ));

    return bot;
  });
}

// ✗ WRONG - non-atomic, can fail mid-way
async createBotWithKnowledgeBases(dto, kbIds) {
  const bot = await this.prisma.bot.create({data: dto});

  for (const kbId of kbIds) {
    await this.prisma.botKnowledgeBase.create({
      data: {botId: bot.id, knowledgeBaseId: kbId}
    });
  }
  // If loop fails partway, bot exists but KBs don't connect
  return bot;
}
```

**Always filter by tenantId for multi-tenant safety:**

```typescript
// ✓ CORRECT - tenant-aware
async getBot(botId: string, tenantId: string) {
  return this.prisma.bot.findFirst({
    where: {
      id: botId,
      tenantId: tenantId  // CRITICAL for isolation
    }
  });
}

// ✗ WRONG - doesn't verify tenant
async getBot(botId: string) {
  return this.prisma.bot.findUnique({
    where: {id: botId}  // Any tenant can access!
  });
}
```

### Guard Patterns

**Create composable, single-responsibility guards:**

```typescript
// ✓ CORRECT - single concern
@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const tenantId = request.params.tenantId;

    if (user.tenantId !== tenantId) {
      throw new ForbiddenException('Tenant mismatch');
    }
    return true;
  }
}

// Use with guards array
@UseGuards(JwtAuthGuard, TenantGuard)
@Get(':tenantId/bots')
async getBots(@Param('tenantId') tenantId: string) {
  return this.botsService.findByTenant(tenantId);
}

// ✗ WRONG - mixed concerns
@Injectable()
export class MixedGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    // JWT validation
    // Tenant isolation
    // Quota checking
    // Role checking
    // ← Too many responsibilities!
  }
}
```

### Pagination

**Always paginate list endpoints:**

```typescript
// ✓ CORRECT - with pagination
export class PaginationDto {
  @IsInt()
  @Min(1)
  @Max(1000)
  limit: number = 50;

  @IsInt()
  @Min(0)
  offset: number = 0;
}

@Get()
async listBots(
  @Query() pagination: PaginationDto,
  @User() user: AuthUser
) {
  const bots = await this.botsService.findByTenant(
    user.tenantId,
    pagination
  );

  return {
    data: bots,
    total: await this.botsService.countByTenant(user.tenantId),
    limit: pagination.limit,
    offset: pagination.offset
  };
}

// ✗ WRONG - no pagination
async listBots(@User() user: AuthUser) {
  return this.prisma.bot.findMany({
    where: {tenantId: user.tenantId}
    // Returns ALL bots - will kill performance!
  });
}
```

### Immutability & Data Patterns

**Create new objects, never mutate existing ones:**

```typescript
// ✓ CORRECT - immutable update
async updateBot(id: string, updateDto: UpdateBotDto) {
  return this.prisma.bot.update({
    where: {id},
    data: {...updateDto}  // Spreads new values
  });
}

// ✓ CORRECT - method returns new array
const addQuestion = (questions: string[], newQ: string) => {
  return [...questions, newQ];
};

// ✗ WRONG - mutates existing object
async updateBot(id: string, updates: any) {
  const bot = await this.prisma.bot.findUnique({where: {id}});
  Object.assign(bot, updates);  // Mutates bot!
  await this.prisma.bot.update({where: {id}, data: bot});
}

// ✗ WRONG - mutates array
const addQuestion = (questions: string[], newQ: string) => {
  questions.push(newQ);  // Mutates input!
  return questions;
};
```

---

## Engine (FastAPI) Standards

### Project Structure

**Feature-based organization:**

```
app/
├── api/                  # HTTP endpoints
│   ├── router.py
│   ├── documents.py
│   ├── chat.py
│   └── knowledge_bases.py
├── core/                 # Core infrastructure
│   ├── qdrant_handler.py
│   ├── triton_client.py
│   └── rrf.py
├── services/            # Business logic
│   ├── document_processor.py
│   ├── chunker.py
│   ├── embedding_service.py
│   └── rag_chat.py
├── models/              # Pydantic DTOs
│   ├── requests.py
│   └── responses.py
├── worker/              # Celery background tasks
│   ├── celery_app.py
│   └── tasks.py
├── dependencies.py      # FastAPI dependency injection
├── config.py            # Configuration
└── main.py              # Application entry point
```

### Dependency Injection

**Use FastAPI dependencies:**

```python
# ✓ CORRECT - using FastAPI dependencies
from fastapi import Depends

def get_qdrant_handler() -> QdrantHandler:
    return QdrantHandler(url=settings.QDRANT_URL)

@router.get("/documents")
async def list_documents(
    kb_id: str,
    qdrant: QdrantHandler = Depends(get_qdrant_handler)
):
    return qdrant.search(kb_id)

# ✗ WRONG - hardcoded dependency
@router.get("/documents")
async def list_documents(kb_id: str):
    qdrant = QdrantHandler(url=settings.QDRANT_URL)
    # Creates new instance every request - inefficient!
    return qdrant.search(kb_id)
```

### Pydantic Models

**Always validate with Pydantic:**

```python
# ✓ CORRECT - with validation
from pydantic import BaseModel, Field, validator

class DocumentRequest(BaseModel):
    knowledge_base_id: str
    file_name: str = Field(..., min_length=1, max_length=255)
    source_type: str = Field(..., regex='^(file_upload|url_crawl|text_input)$')

    @validator('file_name')
    def validate_file_name(cls, v):
        if any(char in v for char in ['/', '\\', '\0']):
            raise ValueError('Invalid file name')
        return v

@router.post("/documents/process")
async def process_document(doc: DocumentRequest):
    # doc is validated before function runs
    return await service.process(doc)

# ✗ WRONG - no validation
@router.post("/documents/process")
async def process_document(doc: dict):
    # Could contain anything!
    return await service.process(doc)
```

### Async/Await

**Always use async/await, never blocking calls:**

```python
# ✓ CORRECT - async throughout
async def chat_stream(kb_id: str):
    # Async search
    results = await qdrant_handler.search_async(kb_id)

    # Async LLM call
    async for chunk in llm.stream_completions(...):
        yield chunk

# ✗ WRONG - blocking in async function
async def chat_stream(kb_id: str):
    results = qdrant_handler.search(kb_id)  # BLOCKS!

    # Blocks entire event loop
    full_response = llm.complete(...)
    yield full_response
```

### Error Handling

**Explicit error handling with proper HTTP status codes:**

```python
# ✓ CORRECT - proper error handling
from fastapi import HTTPException

@router.get("/documents/{id}/chunks")
async def get_chunks(id: str, kb_id: str):
    try:
        chunks = await qdrant_handler.get_chunks(id, kb_id)
        if not chunks:
            raise HTTPException(status_code=404, detail="Chunks not found")
        return chunks
    except QdrantException as e:
        logger.error(f"Qdrant error: {e}", extra={'doc_id': id})
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve chunks"
        )

# ✗ WRONG - swallows errors
@router.get("/documents/{id}/chunks")
async def get_chunks(id: str, kb_id: str):
    chunks = await qdrant_handler.get_chunks(id, kb_id)
    return chunks  # What if it fails? Returns 500 with traceback
```

### Logging

**Use structured logging:**

```python
import structlog

logger = structlog.get_logger()

# ✓ CORRECT - structured context
async def process_document(doc_id: str, kb_id: str):
    logger.info(
        "Processing document",
        doc_id=doc_id,
        kb_id=kb_id
    )

    try:
        result = await text_extractor.extract(doc_id)
        logger.info(
            "Document extracted",
            doc_id=doc_id,
            chunk_count=len(result)
        )
        return result
    except Exception as e:
        logger.error(
            "Document processing failed",
            doc_id=doc_id,
            kb_id=kb_id,
            error=str(e)
        )
        raise

# ✗ WRONG - unstructured logging
async def process_document(doc_id: str, kb_id: str):
    print(f"Processing {doc_id}")  # Can't filter in production!
    result = await text_extractor.extract(doc_id)
    print(f"Done: {result}")
```

### Configuration

**Use environment variables via Pydantic Settings:**

```python
# ✓ CORRECT - centralized config
from pydantic import BaseSettings

class Settings(BaseSettings):
    QDRANT_URL: str = "http://localhost:6333"
    TRITON_HOST: str = "localhost"
    TRITON_PORT: int = 8000
    REDIS_URL: str = "redis://localhost:6379"

    class Config:
        env_file = ".env"

settings = Settings()

# ✗ WRONG - hardcoded values
QDRANT_URL = "http://localhost:6333"
TRITON_HOST = "localhost"
# Can't change without code changes!
```

---

## Testing Standards

### Test-Driven Development (TDD)

**Workflow:**
1. Write failing test (RED)
2. Write minimal implementation (GREEN)
3. Refactor (IMPROVE)
4. Verify coverage (80%+)

**Example:**

```typescript
// 1. RED - test fails
describe('BotsService.updateBotPersonality', () => {
  it('should update bot personality and preserve other fields', async () => {
    const bot = await service.create({name: 'Test Bot'});
    const updatedBot = await service.updateBotPersonality(bot.id, {
      systemPrompt: 'New prompt'
    });

    expect(updatedBot.name).toBe('Test Bot');  // Unchanged
    expect(updatedBot.systemPrompt).toBe('New prompt');  // Updated
  });
});

// 2. GREEN - minimal implementation
async updateBotPersonality(id: string, personality: Partial<Personality>) {
  return this.prisma.bot.update({
    where: {id},
    data: {personality}
  });
}

// 3. IMPROVE - refactor
async updateBotPersonality(
  id: string,
  personality: Partial<Personality>
): Promise<Bot> {
  // Validate personality structure
  if (!this.isValidPersonality(personality)) {
    throw new BadRequestException('Invalid personality config');
  }

  return this.prisma.bot.update({
    where: {id},
    data: {personality}
  });
}
```

### Unit Test Examples

**Backend (NestJS + Jest):**

```typescript
describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;

  beforeEach(() => {
    const module = Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: {
            user: {findUnique: jest.fn()}
          }
        }
      ]
    }).compile();

    service = module.get(AuthService);
    prisma = module.get(PrismaService);
  });

  describe('login', () => {
    it('should return JWT token for valid credentials', async () => {
      const mockUser = {id: '1', email: 'test@example.com', password: '$2b$...'};
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);

      const result = await service.login('test@example.com', 'password123');

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });

    it('should throw UnauthorizedException for invalid email', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);

      await expect(
        service.login('invalid@example.com', 'password123')
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
```

**Engine (FastAPI + Pytest):**

```python
import pytest
from unittest.mock import AsyncMock, MagicMock

@pytest.mark.asyncio
async def test_chat_stream():
    # Arrange
    mock_qdrant = AsyncMock()
    mock_qdrant.search_async.return_value = [
        {'text': 'chunk1', 'score': 0.9}
    ]

    service = RAGChatService(qdrant=mock_qdrant)

    # Act
    chunks = []
    async for chunk in service.chat_stream(kb_id='kb-123', query='test'):
        chunks.append(chunk)

    # Assert
    assert len(chunks) > 0
    assert chunks[0] is not None

@pytest.mark.asyncio
async def test_document_processing_error_handling():
    service = DocumentProcessor(...)

    with pytest.raises(ProcessingError):
        await service.process(doc_id='invalid')
```

### Test Coverage

**Minimum 80% code coverage:**
- All critical paths tested
- Error cases tested
- Integration points tested
- Edge cases tested

**Coverage Report Commands:**

```bash
# Backend
npm run test:cov

# Engine
pytest --cov=app --cov-report=html
```

---

## Code Review Checklist

Before submitting code for review:

- [ ] Code follows naming conventions (kebab-case files, camelCase variables)
- [ ] Files under 200 lines (split if larger)
- [ ] DTOs/validation used for all inputs
- [ ] Errors handled explicitly with try/catch
- [ ] No hardcoded values (use config)
- [ ] Database queries use parameterized values
- [ ] Multi-tenant logic includes tenantId filtering
- [ ] No mutation of input parameters
- [ ] Async/await used (no blocking in async functions)
- [ ] Logging is structured and contextual
- [ ] Tests cover 80%+ of code
- [ ] Integration tests pass
- [ ] No security vulnerabilities (secrets, SQL injection, XSS)
- [ ] Documentation updated if API changed
- [ ] Commit messages follow conventional format

---

## Conventional Commits

All commits must follow this format:

```
<type>: <description>

<optional body>

<optional footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code refactoring (no behavior change)
- `test`: Test additions/modifications
- `docs`: Documentation changes
- `chore`: Dependencies, build config
- `perf`: Performance optimization

**Examples:**
```
feat: add document reprocessing endpoint

Allows users to re-index documents after fixing source files.
Clears old embeddings and re-runs processing pipeline.

Closes #123

---

fix: prevent cross-tenant conversation hijacking

Added tenantId validation in getOrCreate() to ensure
users can only access their own conversations.

---

docs: update system architecture diagram

Added Phase 2 AI Engine integration points.
```

---

## Documentation Standards

### Code Comments

**Write comments for WHY, not WHAT:**

```typescript
// ✓ CORRECT - explains decision
async updateBot(id: string, updates: UpdateBotDto) {
  // Validate personality config before persisting
  // to prevent invalid system prompts breaking chat
  if (updates.personality) {
    this.validatePersonality(updates.personality);
  }

  return this.prisma.bot.update({
    where: {id},
    data: updates
  });
}

// ✗ WRONG - restates code
async updateBot(id: string, updates: UpdateBotDto) {
  // Check if personality exists
  if (updates.personality) {
    // Validate personality
    this.validatePersonality(updates.personality);
  }

  // Update the bot
  return this.prisma.bot.update({
    where: {id},
    data: updates
  });
}
```

### README Files

Each service should have a README covering:
- Purpose and key features
- Technology stack
- Setup instructions
- API documentation link
- Testing instructions
- Deployment guide

---

## Performance Guidelines

### Database Query Optimization

```typescript
// ✗ WRONG - N+1 queries
const bots = await this.prisma.bot.findMany();
for (const bot of bots) {
  bot.kbs = await this.prisma.knowledgeBase.findMany({
    where: {bots: {some: {id: bot.id}}}
  });
}

// ✓ CORRECT - single query with relations
const bots = await this.prisma.bot.findMany({
  include: {
    knowledgeBases: true
  }
});
```

### Batch Operations

```python
# ✗ WRONG - individual inserts
for chunk in chunks:
    await qdrant.upsert_point(chunk)

# ✓ CORRECT - batch insert
await qdrant.upsert_points(chunks)  # Single operation
```

---

## Summary

These standards ensure:
- **Consistency** across both services
- **Maintainability** through clear organization
- **Security** with multi-tenant isolation
- **Quality** through comprehensive testing
- **Performance** via optimized queries and async patterns

Follow these guidelines for all new code. Questions? Refer to existing implementations or request clarification in code reviews.
