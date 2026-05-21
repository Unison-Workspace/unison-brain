# Unison Brain API — Specification

This is the contract the **Unison backend** must implement for this open-source
client (SDK / CLI / MCP) to work. It lives here, in the public client repo, so the
contract is reviewable by integrators — but **nothing in this spec is implemented
in this repo**. Implementation happens in the closed Unison monorepo (primarily
`apps/api`), wrapping the existing `cortexRouter` primitives behind REST + an
API-key auth path.

- **Base URL:** configurable; production TBD (client default `https://api.unison.computer`).
- **Versioning:** all paths are prefixed with `/v1`.
- **Encoding:** JSON request/response bodies; field names are `camelCase`.
- **Auth:** `Authorization: Bearer <token>` on every request except the device-code
  endpoints. Token is either an API key (`usk_...`) or a device-flow access token.

---

## Why a new auth path is the only real blocker

Today every Unison API request requires a live **Supabase user JWT**. A headless
CLI / MCP server cannot get one. The backend therefore needs a **machine-credential
path**:

1. An `api_keys` table: `(id, tenant_id, user_id, name, hashed_key, scopes[],
   last_used_at, created_at, revoked_at)`. Store only a hash (e.g. SHA-256) of the
   key; show the plaintext once at creation.
2. In the API request context builder, branch on the credential type:
   - `Bearer usk_...` → look up the hashed key, resolve `(tenant_id, user_id,
     scopes)`, mint a synthetic authed context bound to that tenant.
   - `Bearer <supabase-jwt>` → existing path, unchanged.
3. Scopes: `brain:read`, `brain:write`. Reads require `brain:read`; `PUT /brain/doc`
   requires `brain:write`.

The device flow below mints the same kind of token after a browser approval, so
interactive users never copy-paste a key.

---

## Authentication endpoints

### `POST /v1/auth/device/code`
Start the OAuth 2.0 Device Authorization Grant (RFC 8628).

Request: `{ "clientId": "unison-cli" }`

Response `200`:
```json
{
  "deviceCode": "string (opaque, server-stored)",
  "userCode": "WDJB-MJHT",
  "verificationUri": "https://app.unison.computer/device",
  "verificationUriComplete": "https://app.unison.computer/device?code=WDJB-MJHT",
  "interval": 5,
  "expiresIn": 900
}
```

### `POST /v1/auth/device/token`
Poll for the token. Called every `interval` seconds.

Request: `{ "deviceCode": "..." }`

- Pending → `400` `{ "error": "authorization_pending" }`
- Polling too fast → `400` `{ "error": "slow_down" }`
- User declined → `400` `{ "error": "access_denied" }`
- Code expired → `400` `{ "error": "expired_token" }`
- Approved → `200`:
  ```json
  { "accessToken": "usk_live_...", "tokenType": "Bearer", "scope": "brain:read brain:write" }
  ```

The verification page (`/device`) is an authenticated dashboard route: the
logged-in user enters/confirms the `userCode`, picks the tenant, and approves —
which is what mints the token returned above.

### `GET /v1/auth/whoami`
Response `200`:
```json
{
  "user": { "id": "uuid", "email": "a@b.com" },
  "tenant": { "id": "uuid", "name": "Acme" },
  "scopes": ["brain:read", "brain:write"]
}
```

---

## Brain endpoints

All map onto existing `cortexRouter` procedures; this is a thin REST facade.

### `GET /v1/brain/search`
Query params: `q` (required), `k` (default 10), `kind`, `tag`.
Maps to `cortex.search` (hybrid BM25 + vector + RRF).
```json
{
  "results": [
    { "path": "/wiki/auth", "title": "Auth", "snippet": "...", "score": 0.81, "kind": "wiki", "tags": ["security"] }
  ]
}
```

### `GET /v1/brain/doc`
Query param: `path` (required). Maps to `cortex.read`.
```json
{ "path": "/wiki/auth", "title": "Auth", "content": "# Auth\n...", "kind": "wiki", "tags": ["security"], "updatedAt": "2026-05-21T10:00:00Z" }
```
Not found → `404` `{ "error": { "code": "not_found", "message": "..." } }`.

### `PUT /v1/brain/doc`
Requires `brain:write`. Maps to `cortex.write`.
Request: `{ "path": "/notes/x", "content": "...", "kind": "note", "tags": ["a"] }`
Response `200`: the stored document (same shape as `GET /brain/doc`).

### `GET /v1/brain/list`
Query params: `prefix`, `limit` (default 100). Maps to `cortex.list`.
```json
{ "items": [ { "path": "/wiki/auth", "title": "Auth", "kind": "wiki", "updatedAt": "..." } ] }
```

### `GET /v1/brain/status`
Maps to counts over `cortex_documents` / `cortex_entities` / `cortex_facts` / jobs.
```json
{ "documents": 412, "entities": 88, "facts": 1203, "pendingJobs": 0 }
```

---

## Errors

Non-2xx responses (other than the device-flow OAuth error strings above) use:
```json
{ "error": { "code": "snake_case_code", "message": "human readable" } }
```
Standard codes: `unauthenticated` (401), `forbidden` (403, missing scope),
`not_found` (404), `rate_limited` (429), `http_error` (5xx).

## Rate limiting

Per-API-key. Include `X-RateLimit-Limit`, `X-RateLimit-Remaining`,
`X-RateLimit-Reset` on responses; `429` carries `Retry-After`.

---

## Future (not in v1)

`/v1/brain/entities`, `/v1/brain/facts`, `/v1/brain/grep`, and a `watch`/sync
endpoint to back `brain-cli watch`-style local vault mirroring. The SDK is
structured so these slot in as new `BrainClient` methods without breaking changes.
