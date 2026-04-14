# Phase 05 — Flow CRUD + CustomTool CRUD API (NestJS)

**Status:** ⬜ pending

## Goal
REST API for Flow + CustomTool entities. Validation pre-save (call engine `/validate`). Node palette proxy. Bot-Flow 1:1 attach/detach.

## Files to create

```
genai-platform-api/src/modules/flows/
  flows.module.ts
  flows.controller.ts
  flows.service.ts
  flows.service.spec.ts
  dto/
    create-flow.dto.ts
    update-flow.dto.ts
    flow-response.dto.ts
    execute-flow.dto.ts
  types/
    flow-data.types.ts         # TS types for { nodes, edges }
    node-definition.types.ts

genai-platform-api/src/modules/custom-tools/
  custom-tools.module.ts
  custom-tools.controller.ts
  custom-tools.service.ts
  custom-tools.service.spec.ts
  dto/
    create-custom-tool.dto.ts
    update-custom-tool.dto.ts
    custom-tool-response.dto.ts
```

## API routes

### Flow
```
POST   /api/v1/flows                     Create
GET    /api/v1/flows                     List (tenant-scoped, paginated)
GET    /api/v1/flows/:id                 Get detail
PATCH  /api/v1/flows/:id                 Update (name, description, flowData)
DELETE /api/v1/flows/:id                 Delete (rejected if bot references it — swap first)
POST   /api/v1/flows/:id/duplicate       Clone
GET    /api/v1/flows/node-types          Proxy → engine /v1/flows/node-types (cached 5min)
POST   /api/v1/flows/validate            Proxy → engine /v1/flows/validate
GET    /api/v1/flows/templates           List seed templates
POST   /api/v1/flows/from-template       Create flow from template ID
POST   /api/v1/bots/:botId/swap-flow     Atomic: replace bot's flowId with another tenant-owned flow
```

### CustomTool
```
POST   /api/v1/custom-tools              Create (validate schema + impl compile)
GET    /api/v1/custom-tools              List (tenant-scoped)
GET    /api/v1/custom-tools/:id          Get detail
PATCH  /api/v1/custom-tools/:id          Update
DELETE /api/v1/custom-tools/:id          Delete (block if referenced by Agent node in any flow)
POST   /api/v1/custom-tools/:id/test     Dry-run with sample input (engine proxy)
```

## DTO shapes

```ts
// create-flow.dto.ts
export class CreateFlowDto {
  @IsString() @Length(1, 255) name: string;
  @IsOptional() @IsString() description?: string;
  @IsIn(['agentflow', 'chatflow']) type: 'agentflow' | 'chatflow' = 'agentflow';
  @IsObject() @ValidateNested() flowData: FlowData;
}

// flow-data.types.ts
export interface FlowData {
  nodes: FlowNode[];
  edges: FlowEdge[];
  viewport?: { x: number; y: number; zoom: number };
}

export interface FlowNode {
  id: string;
  type: string;                        // start | llm | agent | custom_tool | custom_function | condition | retriever | direct_reply | sticky_note | http | human_input
  position: { x: number; y: number };
  data: Record<string, any>;           // node-specific config, may include `update_flow_state: [{key, value}]`
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

// create-custom-tool.dto.ts
export class CreateCustomToolDto {
  @IsString() @Length(1, 128) @Matches(/^[a-z][a-z0-9_]*$/) name: string;   // snake_case, used as tool identifier for LLM
  @IsOptional() @IsString() @MaxLength(2000) description?: string;          // shown to Agent LLM
  @IsObject() schema: Record<string, any>;                                  // JSON Schema for tool args
  @IsString() @MaxLength(20000) implementation: string;                     // RestrictedPython source
}
```

## Service logic — Flow

```ts
@Injectable()
export class FlowsService {
  constructor(
    private prisma: PrismaService,
    private http: HttpService,
    @Inject('ENGINE_URL') private engineUrl: string,
  ) {}

  async create(tenantId: string, userId: string, dto: CreateFlowDto) {
    const validation = await this.validateWithEngine(dto.flowData);
    if (!validation.valid) {
      throw new BadRequestException({ errors: validation.errors });
    }
    return this.prisma.flow.create({
      data: {
        tenantId,
        createdBy: userId,
        name: dto.name,
        description: dto.description,
        type: dto.type,
        flowData: dto.flowData,
      },
    });
  }

  async list(tenantId: string, params: PaginationDto) {
    return paginate(this.prisma.flow, { where: { tenantId } }, params);
  }

  async getNodeTypes(): Promise<NodeDefinition[]> {
    const cached = await this.cache.get('node-types');
    if (cached) return cached;
    const { data } = await this.http.get(`${this.engineUrl}/v1/flows/node-types`);
    await this.cache.set('node-types', data.nodes, 300);
    return data.nodes;
  }

  private async validateWithEngine(flowData: FlowData) {
    const { data } = await this.http.post(
      `${this.engineUrl}/v1/flows/validate`,
      flowData,
      { headers: { 'X-Internal-Key': this.internalKey } },
    );
    return data;
  }
}
```

## Service logic — CustomTool

```ts
const CUSTOM_TOOL_CAP_PER_TENANT = 50;

@Injectable()
export class CustomToolsService {
  constructor(
    private prisma: PrismaService,
    private http: HttpService,
    @Inject('ENGINE_URL') private engineUrl: string,
  ) {}

  async create(tenantId: string, userId: string, dto: CreateCustomToolDto) {
    // 1. Enforce hard cap
    const count = await this.prisma.customTool.count({ where: { tenantId } });
    if (count >= CUSTOM_TOOL_CAP_PER_TENANT) {
      throw new BadRequestException(`Max ${CUSTOM_TOOL_CAP_PER_TENANT} custom tools per tenant`);
    }

    // 2. Validate JSON Schema structure (Draft-07)
    this.validateJsonSchema(dto.schema);

    // 3. Delegate to engine for RestrictedPython compile check
    //    Engine returns { compilable: bool, errors: [...] }
    const compile = await this.http.post(
      `${this.engineUrl}/v1/sandbox/compile-check`,
      { code: dto.implementation },
      { headers: { 'X-Internal-Key': this.internalKey } },
    );
    if (!compile.data.compilable) {
      throw new BadRequestException({ compileErrors: compile.data.errors });
    }

    // 4. Persist (unique [tenantId, name])
    try {
      return await this.prisma.customTool.create({
        data: {
          tenantId,
          createdBy: userId,
          name: dto.name,
          description: dto.description,
          schema: dto.schema,
          implementation: dto.implementation,
        },
      });
    } catch (e) {
      if (e.code === 'P2002') throw new ConflictException(`Tool name '${dto.name}' already exists`);
      throw e;
    }
  }

  async delete(tenantId: string, id: string) {
    // Block delete if any Agent node references this tool ID
    const referencingFlows = await this.findFlowsUsingTool(tenantId, id);
    if (referencingFlows.length > 0) {
      throw new ConflictException({
        message: 'Tool in use',
        flows: referencingFlows.map((f) => ({ id: f.id, name: f.name })),
      });
    }
    return this.prisma.customTool.delete({ where: { id, tenantId } });
  }

  async testRun(tenantId: string, id: string, sampleInput: any) {
    const tool = await this.getOrThrow(tenantId, id);
    const { data } = await this.http.post(
      `${this.engineUrl}/v1/sandbox/execute-tool`,
      { schema: tool.schema, implementation: tool.implementation, input: sampleInput },
      { headers: { 'X-Internal-Key': this.internalKey } },
    );
    return data;   // { output, duration_ms, error? }
  }

  private async findFlowsUsingTool(tenantId: string, toolId: string) {
    // Scan flows.flowData JSON for Agent nodes with tools array containing toolId
    // Postgres JSON path query:
    return this.prisma.$queryRaw<{ id: string; name: string }[]>`
      SELECT id, name FROM flows
      WHERE tenant_id = ${tenantId}::uuid
        AND flow_data @? '$.nodes[*] ? (@.type == "agent" && @.data.tools[*] == ${toolId})'
    `;
  }

  private validateJsonSchema(schema: any) {
    // Use ajv to ensure schema itself is valid JSON Schema Draft-07
    const ajv = new Ajv({ strict: false });
    try {
      ajv.compile(schema);
    } catch (e) {
      throw new BadRequestException(`Invalid JSON Schema: ${e.message}`);
    }
  }
}
```

## Validation rules (NestJS-side, before engine)

- Nodes array non-empty
- Exactly 1 `start` node
- At least 1 terminal node — `direct_reply` OR `human_input`
- All edge `source`/`target` reference existing node IDs
- No duplicate node IDs
- Node `type` is valid (cross-check against cached node-types list)
- For Agent nodes with `tools` array → every tool ID must exist in CustomTool table for this tenant
- `update_flow_state` entries (if present) — `key` is non-empty, `value` is literal or `{{ref}}` syntax

Engine-side validation (Phase 03) adds:
- Required inputs satisfied (literal or edge-connected)
- Credential refs point to existing credentials
- No orphan nodes (unreachable from start)
- No cycles (unless loop-enabled node type)

## Bot-Flow 1:1 enforcement

- `Bot.flowId` is NOT NULL + `@unique` (Phase 01). Every bot always has exactly one flow.
- New bot creation auto-provisions `simple-rag` template flow (see Phase 10).
- `POST /api/v1/bots/:botId/swap-flow { flowId }` — atomic: verifies new flow belongs to tenant + new flow not attached to another bot + reassigns bot.flowId. Previous flow becomes unattached (still queryable, deletable).
- Flow delete while attached to a bot → rejected (`onDelete: Restrict`). User must swap bot's flow first, then delete the orphaned flow.
- No detach endpoint — `Bot.flowId` cannot be null.

## Seed templates

Service exposes `GET /templates` → list + `POST /from-template` → deep-clone template → create flow for tenant. Full template set (5) defined in Phase 10. Templates reference placeholder credential IDs; UI must prompt user to bind real credentials on first import.

## Guards

- `JwtAuthGuard` + `TenantGuard` on all `/api/v1/flows/*` and `/api/v1/custom-tools/*`
- Tenant isolation: every query `where: { tenantId }`
- Quota: `@QuotaType('flows')` on flow create, `@QuotaType('custom_tools')` on tool create (hard cap 50)

## Success criteria

### Flow
- [ ] Full CRUD works end-to-end via Swagger
- [ ] Create with invalid flowData → 400 with engine error list
- [ ] Tenant A cannot read/edit Tenant B's flow (403/404)
- [ ] `GET /node-types` returns engine's 11 nodes
- [ ] Duplicate creates new flow with new ID but same flowData
- [ ] Flow without `direct_reply`/`human_input` terminal → 400
- [ ] Templates seeded → `POST /from-template/simple-rag` creates working flow
- [ ] Swap bot's flow → bot.flowId updated, previous flow unattached
- [ ] Swap to a flow already attached to another bot → 409 (1:1 enforced)
- [ ] Delete flow attached to any bot → rejected with reference list (user must swap first)

### CustomTool
- [ ] CRUD end-to-end via Swagger
- [ ] Create with malformed JSON Schema → 400
- [ ] Create with uncompilable RestrictedPython → 400 with engine error list
- [ ] Duplicate name per tenant → 409
- [ ] Create 51st tool → 400 (cap enforced)
- [ ] Delete tool referenced by Agent node → 409 with flow list
- [ ] `POST /:id/test` with sample input returns output or error
- [ ] Tenant A cannot read/edit Tenant B's tool (403/404)

## Risks

- **Large flowData JSON** — set reasonable size limit (~1MB) to prevent abuse
- **Engine down during validate/compile-check** — graceful fallback: allow save with warning flag, re-validate on execute. **Exception:** compile-check is hard-required for CustomTool create (security-sensitive; no fallback)
- **Race on node-types cache** — use SWR pattern, not hard cache
- **JSON path query for tool references** — Postgres `@?` requires jsonb column + GIN index on flow_data (add in Phase 01 if slow)
- **Tool name collision with LangChain built-ins** — reserve prefix `ct_` or validate against built-in tool name list

## Out of scope

- Flow versioning (phase 2)
- Flow export/import JSON (phase 2)
- CustomTool versioning / rollback (phase 2)
- Public tool marketplace (phase 2)
