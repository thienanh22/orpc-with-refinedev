# oRPC POC — versioning, caching, OpenAPI, client generation

A proof-of-concept exploring [oRPC](https://orpc.dev) (v1.14.4) and whether it
solves the tRPC pain points the backend team raised. Spoiler: it does.

A single contract-first "Planet API" is served simultaneously as **REST**
(real HTTP verbs + unique URLs, with OpenAPI docs) and as a compact **RPC**
protocol — from the exact same procedures, validation, and types.

## Run it

```bash
pnpm install
pnpm typecheck        # whole thing is type-checked
pnpm gen:openapi      # writes ./openapi.json (client-gen input)
pnpm start            # server on :3000  (leave running)
pnpm client           # in another terminal: typed client demo
```

Then open <http://localhost:3000/docs> for the interactive Scalar API reference,
and <http://localhost:3000/spec.json> for the live spec.

## The tRPC concerns, answered

> Backend đang lo lắng oRPC có dính các vấn đề của tRPC không. Kết quả:

| # | tRPC concern | oRPC result | Where in this POC |
|---|--------------|-------------|-------------------|
| 1 | **Mọi method đều là POST → không cache được** | Mỗi procedure khai báo HTTP verb thật. Reads là `GET` và đặt `Cache-Control`. Bất kỳ HTTP cache nào (browser/CDN/proxy) đều honor được. | `GET /api/v1/planets` trả `cache-control: public, max-age=60` — xem `src/middleware.ts` (`cache()`) + `ResponseHeadersPlugin` |
| 2 | **Mọi call vào 1 endpoint duy nhất → khó load balancing** | Mỗi resource là 1 URL riêng (`/api/v1/planets`, `/api/v1/planets/{id}`, …). LB / WAF / API gateway route & cache theo path/method bình thường. | `src/contract.ts` `.route({ method, path })`; xem danh sách path trong `openapi.json` |
| 3 | API versioning | Contract-first: v1 và v2 là 2 contract độc lập, evolve riêng. v2 ở POC này đổi shape (bỏ `description`, thêm `climate` enum + `discoveredYear`). | `src/contract.ts` (`v1Contract`, `v2Contract`), mount tại `/api/v1/**` và `/api/v2/**` |
| 4 | OpenAPI spec | Sinh OpenAPI 3.1.1 trực tiếp từ contract → không bao giờ lệch với server. | `pnpm gen:openapi`, `src/generate-openapi.ts`, `OpenAPIReferencePlugin` |
| 5 | Client generation tooling | 2 lựa chọn (xem bên dưới). | `src/client.ts` |

## Demonstrated features

- **Contract-first** (`@orpc/contract`) — the API is described once; the server
  *implements* it and is compile-time + runtime checked against it
  (`src/contract.ts` → `implement()` in `src/context.ts`).
- **Dual transport from one router** — `OpenAPIHandler` (REST) and `RPCHandler`
  (RPC) in `src/server.ts`.
- **Validation** via Zod 4 schemas, shared between runtime + OpenAPI
  (`src/schemas.ts`). Bad input → HTTP 400 with structured issues.
- **Caching** — `Cache-Control` on GETs via `ResponseHeadersPlugin`.
- **Middleware / context** — logging + bearer-token auth on mutations
  (`src/middleware.ts`). No token → HTTP 401.
- **Type-safe errors** — `.errors({ NOT_FOUND })` with typed `data`; client uses
  `safe()` / `isDefinedError` (`src/client.ts`). Missing id → HTTP 404.
- **Correct status codes** — `201` on create, `204` on delete (`successStatus`).
- **Interactive docs** — Scalar UI at `/docs`.

## Client generation: two paths

1. **Internal TS↔TS (recommended): no codegen.** The client type *is* the server
   type. Import `RouterClient<typeof router>` (RPC) or
   `ContractRouterClient<typeof contract>` (REST via `OpenAPILink`) and get full
   autocomplete/refactor safety with zero build step. See `src/client.ts`.
2. **External / polyglot consumers: standard OpenAPI codegen.** `openapi.json`
   feeds any generator:
   ```bash
   npx openapi-typescript openapi.json -o client-types.ts   # TS types
   # or orval / openapi-generator-cli / Speakeasy / Fern for SDKs in any language
   ```
   Plus there's a TanStack Query integration (`@orpc/tanstack-query`) for
   React/Vue/Solid/Svelte query+mutation hooks.

## Layout

```
src/
  schemas.ts          Zod schemas (v1 + v2 shapes)
  db.ts               in-memory store backing both versions
  contract.ts         contract-first API definition (verbs, paths, errors)
  context.ts          request context + implement(contract)
  middleware.ts       logging, auth, cache
  router.ts           v1 + v2 implementations of the contract
  server.ts           OpenAPIHandler + RPCHandler + plugins + Scalar docs
  generate-openapi.ts writes openapi.json
  client.ts           typed REST (OpenAPILink) + typed RPC (RPCLink) demo
openapi.json          generated spec
```

## Verified behavior (from `pnpm client` + curl)

```
GET    /api/v1/planets        200  cache-control: public, max-age=60
GET    /api/v1/planets/999    404  {code:"NOT_FOUND", data:{id:999}}   (typed)
POST   /api/v1/planets        401  (no bearer token)
POST   /api/v1/planets        201  (with bearer token)
DELETE /api/v1/planets/3      204
GET    /api/v1/planets?limit=999  400  (validation: <=100)
GET    /api/v2/planets?climate=arid  200  (new shape + filter)
RPC    /rpc/v1/planet/list    200  (same procedure, RPC transport)
```

## Takeaways for backend

- oRPC is **not** "tRPC with the same flaws". With `OpenAPIHandler` it produces a
  conventional REST surface: cacheable GETs, per-resource URLs, real status
  codes, standard OpenAPI — so caching and load balancing work the normal way.
- You still keep tRPC's best part: **end-to-end type safety with no codegen** for
  internal TS clients.
- Contract-first makes **versioning** explicit and decoupled, and guarantees the
  **OpenAPI spec** never drifts from the implementation.
