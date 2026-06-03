import { ORPCError } from '@orpc/server'
import { os } from './context.ts'

/**
 * Logging middleware — runs around every procedure. Shows oRPC middleware
 * "before/after" pattern and how it sees the typed path.
 */
export const logger = os.middleware(async ({ next, path }) => {
  const start = Date.now()
  const result = await next()
  // `path` is the procedure path, e.g. ['v1','planet','list'].
  console.log(`[orpc] ${path.join('.')} ${Date.now() - start}ms`)
  return result
})

/**
 * Auth middleware — gate mutations behind a bearer token.
 * Reads from the typed context (request headers injected by the handler).
 * Throws a normal ORPCError (UNAUTHORIZED) which both the RPC and OpenAPI
 * handlers translate to HTTP 401.
 */
export const requireAuth = os.middleware(async ({ context, next }) => {
  const auth = context.headers['authorization']
  const token = Array.isArray(auth) ? auth[0] : auth
  if (token !== 'Bearer secret-token') {
    throw new ORPCError('UNAUTHORIZED', { message: 'Missing or invalid bearer token' })
  }
  return next()
})

/**
 * Caching middleware — the answer to "all tRPC calls are POST so nothing is
 * cacheable". Because reads are real GETs with stable URLs, we can attach a
 * standard `Cache-Control` header and any HTTP cache (browser, CDN, reverse
 * proxy) will honor it. `resHeaders` is provided by ResponseHeadersPlugin.
 */
export function cache(seconds: number) {
  return os.middleware(async ({ context, next }) => {
    context.resHeaders?.set('Cache-Control', `public, max-age=${seconds}`)
    return next()
  })
}
