# Phase 02 — Credentials Vault

**Status:** ⬜ pending

## Goal
NestJS module managing encrypted 3rd-party API keys per tenant. AES-256-GCM. CRUD + test UI.

## Files to create

| File | Purpose |
|---|---|
| `genai-platform-api/src/modules/credentials/credentials.module.ts` | Module |
| `.../credentials/credentials.controller.ts` | REST routes |
| `.../credentials/credentials.service.ts` | CRUD + encrypt/decrypt |
| `.../credentials/crypto.util.ts` | AES-256-GCM wrapper |
| `.../credentials/dto/*.dto.ts` | Create/Update/Response DTOs |
| `.../credentials/credential-types.ts` | Enum + expected schema per type |
| `.../credentials/credentials.service.spec.ts` | Unit tests |

## API

```
POST   /api/v1/credentials           Create (body: { name, credentialType, data: {...} })
GET    /api/v1/credentials           List (tenant-scoped, NO plaintext returned)
GET    /api/v1/credentials/:id       Get meta (no plaintext)
PATCH  /api/v1/credentials/:id       Update (optional data rotation)
DELETE /api/v1/credentials/:id       Delete
POST   /api/v1/credentials/:id/test  Test credential (per-type health check)

INTERNAL (called by flow-exec only):
POST   /internal/credentials/decrypt  body: { ids: [uuid] } → { [id]: { data: {...} } }
  Guarded by InternalApiKeyGuard (X-Internal-Key)
```

## Crypto

```ts
// crypto.util.ts
const ALG = 'aes-256-gcm';
const KEY = Buffer.from(process.env.CREDENTIAL_ENCRYPTION_KEY, 'hex'); // 32 bytes

export function encrypt(plaintext: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALG, KEY, iv);
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return { encryptedData: enc, iv, authTag };
}

export function decrypt({ encryptedData, iv, authTag }) {
  const decipher = createDecipheriv(ALG, KEY, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encryptedData), decipher.final()]).toString('utf8');
}
```

**Storage format:** `plaintext = JSON.stringify(data)` where `data = {apiKey: "sk-...", baseUrl: "..."}`.

## Credential types (initial)

```ts
enum CredentialType {
  OPENAI = 'openai',           // { apiKey, organizationId? }
  ANTHROPIC = 'anthropic',     // { apiKey }
  VNPT = 'vnpt',               // { apiKey, baseUrl }
  QDRANT = 'qdrant',           // { url, apiKey? }
  TAVILY = 'tavily',           // { apiKey }
  HTTP_BEARER = 'http_bearer', // { token }
  HTTP_BASIC = 'http_basic',   // { username, password }
}
```

Each type has a JSON schema for `data` validation at create time.

## Security

- **CREDENTIAL_ENCRYPTION_KEY** — 32-byte hex in env. Rotate → re-encrypt script.
- Plaintext NEVER leaves NestJS except via `/internal/credentials/decrypt` endpoint (internal guard).
- List/get endpoints return `{ id, name, credentialType, createdAt, maskedPreview: "sk-****abcd" }` — never full secret.
- Audit log (future): every decrypt call logs `{ credId, requestor, timestamp }`.

## Test endpoint

`POST /api/v1/credentials/:id/test` — switch on type:
- `openai`: HEAD `https://api.openai.com/v1/models` with key → check 200
- `vnpt`: POST `{baseUrl}/chat/completions` with tiny payload → check 200
- `qdrant`: GET `{url}/collections` → check 200
- Others: skip test, return `{ ok: true, message: "Test not implemented" }`

## Success criteria

- [ ] Create credential → encryptedData + iv + authTag persisted, plaintext not in DB
- [ ] List credentials → masked preview only, no plaintext
- [ ] Internal decrypt endpoint returns plaintext for given IDs
- [ ] Wrong encryption key → decrypt throws (tamper detection via GCM auth tag)
- [ ] Unit tests cover encrypt roundtrip + tamper detection
- [ ] E2E: create VNPT credential → test endpoint returns ok

## Out of scope

- Key rotation automation (manual script for now)
- HSM / KMS integration
- Per-user credentials (tenant-level only)
- Shared credentials across tenants

## Quota — hard cap 50 per tenant (MVP)

Enforce at create time:

```ts
async create(tenantId: string, dto: CreateCredentialDto) {
  const count = await this.prisma.credential.count({ where: { tenantId } });
  if (count >= 50) {
    throw new ForbiddenException(
      'Credential limit reached (50 per tenant). Delete unused credentials first.'
    );
  }
  // ... proceed with create
}
```

UI: credentials page shows `Used X/50` indicator. Phase 2 → per-plan quotas (Free=5, Starter=20, Pro=50+).
