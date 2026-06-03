import { createORPCClient, safe } from '@orpc/client'
import { RPCLink } from '@orpc/client/fetch'
import { OpenAPILink } from '@orpc/openapi-client/fetch'
import type { JsonifiedClient } from '@orpc/openapi-client'
import type { ContractRouterClient } from '@orpc/contract'
import type { RouterClient } from '@orpc/server'
import { contract } from './contract.ts'
import type { router } from './router.ts'

const BASE = 'http://localhost:3000'
const log = (label: string, value: unknown) =>
  console.log(`\n— ${label} —\n` + JSON.stringify(value, null, 2))

// =========================================================================
// 1) Typed REST client via OpenAPILink (driven by the contract).
//    Speaks plain HTTP/REST, fully typed inputs/outputs/errors.
// =========================================================================
const restLink = new OpenAPILink(contract, {
  url: BASE,
  // Per-request headers — here we always send the bearer token.
  headers: () => ({ authorization: 'Bearer secret-token' }),
})
const rest: JsonifiedClient<ContractRouterClient<typeof contract>> = createORPCClient(restLink)

// =========================================================================
// 2) End-to-end typed RPC client via RPCLink (driven by the router type).
//    No codegen, no spec — the client type IS the server type.
// =========================================================================
const rpcLink = new RPCLink({ url: `${BASE}/rpc` })
const rpc: RouterClient<typeof router> = createORPCClient(rpcLink)

async function main() {
  // --- Proof #1: reads are real, cacheable GETs --------------------------
  // Raw fetch so we can inspect the HTTP method + response headers.
  const raw = await fetch(`${BASE}/api/v1/planets?limit=2`)
  log('GET /api/v1/planets (raw HTTP)', {
    status: raw.status,
    cacheControl: raw.headers.get('cache-control'), // <- set by our cache() middleware
    body: await raw.json(),
  })

  // --- v1 via typed REST client -----------------------------------------
  log('rest.v1.planet.list({ limit: 2 })', await rest.v1.planet.list({ limit: 2 }))
  log('rest.v1.planet.find({ id: 1 })', await rest.v1.planet.find({ id: 1 }))

  // --- Typed error handling ---------------------------------------------
  // `safe()` returns a typed { data, error, isDefined } instead of throwing.
  const { error, data, isDefined } = await safe(rest.v1.planet.find({ id: 999 }))
  if (isDefined && error.code === 'NOT_FOUND') {
    // `error.data` is typed as { id: number } — declared in the contract.
    log('typed NOT_FOUND error', { code: error.code, data: error.data })
  } else {
    log('unexpected result', { error, data })
  }

  // --- Auth-protected mutation (POST, 201) ------------------------------
  const created = await rest.v1.planet.create({ name: 'Neptune', description: 'Windy' })
  log('rest.v1.planet.create -> 201', created)

  // --- v2: breaking shape + climate filter (independent contract) -------
  log('rest.v2.planet.list({ climate: "arid" })', await rest.v2.planet.list({ climate: 'arid' }))
  log(
    'rest.v2.planet.create',
    await rest.v2.planet.create({ name: 'Kepler-22b', climate: 'temperate', discoveredYear: 2011 }),
  )

  // --- Same procedure over the RPC transport ----------------------------
  log('rpc.v1.planet.list({ limit: 1 }) [RPC protocol]', await rpc.v1.planet.list({ limit: 1 }))
}

main().catch((e) => {
  console.error('client demo failed:', e)
  process.exit(1)
})
