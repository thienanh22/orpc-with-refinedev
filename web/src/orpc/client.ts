import { createORPCClient } from '@orpc/client'
import { RPCLink } from '@orpc/client/fetch'
import type { RouterClient } from '@orpc/server'
// Type-only import of the backend router. This single line is what gives the
// whole frontend end-to-end types with ZERO codegen: the client's shape IS the
// server's router type. `import type` is erased at build, so no server code
// (db, node:http, middleware) is ever bundled into the browser.
import type { router } from '@server/router'

const RPC_URL = process.env.NEXT_PUBLIC_ORPC_URL ?? 'http://localhost:3000/rpc'

// The backend's `requireAuth` middleware gates mutations on a bearer token.
// In a real app this comes from your session/auth provider; for the POC we
// fall back to the known demo token so mutations work out of the box.
const TOKEN_KEY = 'orpc.token'
export const DEMO_TOKEN = 'Bearer secret-token'
export const getToken = () => localStorage.getItem(TOKEN_KEY) ?? DEMO_TOKEN
export const setToken = (t: string | null) =>
  t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY)

const link = new RPCLink({
  url: RPC_URL,
  headers: () => ({ authorization: getToken() }),
})

/** Fully-typed oRPC client over the compact RPC transport (`/rpc`). */
export const orpc: RouterClient<typeof router> = createORPCClient(link)
