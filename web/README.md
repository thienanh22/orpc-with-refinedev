# web — Refine × oRPC admin

A headless [Refine](https://refine.dev) v5 admin UI (Vite + React + TypeScript,
styled with [shadcn/ui](https://ui.shadcn.com)) driven entirely by the oRPC
backend in `../src`.

## Run

```bash
# 1) backend (from repo root), leave running
pnpm start                 # http://localhost:3000

# 2) frontend (from this folder)
npm install
npm run dev                # http://localhost:5173
```

Optional: set `VITE_ORPC_URL` to point the client at a non-default `/rpc` URL.

## How the integration works

```
Refine hooks  ──►  orpcDataProvider  ──►  typed oRPC client (RPCLink)  ──►  /rpc
(useTable,         (CRUD ⇄ procedures)    (createORPCClient)
 useForm, …)
```

- **`src/orpc/client.ts`** — the typed oRPC client over the RPC transport.
  It does `import type { router } from '@server/router'`
  (`@server/*` → `../src/*`). Because it's a *type-only* import, esbuild/Vite
  erase it: the browser bundle contains **no backend code** (no `db`,
  `node:http`, middleware), yet the client is fully typed from the server
  router — **zero codegen**.

- **`src/orpc/data-provider.ts`** — a custom Refine [`DataProvider`](https://refine.dev/docs/data/data-provider/).
  This is the seam between Refine's normalized CRUD vocabulary and oRPC's typed,
  versioned procedures:

  | Refine method | oRPC procedure | Mapping notes |
  |---|---|---|
  | `getList` | `*.planet.list` | `currentPage`/`pageSize` → `cursor`/`limit`; `{items}` → `{data}` |
  | `getOne` | `*.planet.find` | `BaseKey` → `number` |
  | `create` | `*.planet.create` | form values asserted to the procedure input type |
  | `update` | `v1.planet.update` | v1 only |
  | `deleteOne` | `v1.planet.delete` | returns void → echoes `{id}` back |

  Two resources are registered behind one provider to exercise the backend's
  versioning story: `planets` (v1, full CRUD) and `planets-v2` (v2, list with a
  `climate` filter mapped from Refine's `CrudFilters`). `ORPCError` is
  translated into Refine's `HttpError`.

- **`src/providers/notification.ts`** — bridges Refine notifications onto
  shadcn's sonner toasts.

- **Pages** (`src/pages/**`) use only **headless** Refine hooks
  (`useTable`, `useForm` from `@refinedev/react-hook-form`, `useShow`,
  `useNavigation`) rendered with shadcn components.

## Known gaps (driven by the contract, not Refine)

- **Sorting** isn't wired: the oRPC contract declares no sort params, so
  Refine's `sorters` are ignored. Add `sort`/`order` to the list schemas +
  handlers in `../src` to enable it.
- **Filtering** beyond v2's single `climate` equality filter isn't supported
  for the same reason.

## Smoke test

`smoke.ts` exercises the exact procedures + transport the data provider uses
(pagination, bearer-auth mutations, v2 climate filter) against a running
backend: `npx tsx web/smoke.ts`.
