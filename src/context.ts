import { implement } from '@orpc/server'
import type { ResponseHeadersPluginContext } from '@orpc/server/plugins'
import { contract } from './contract.ts'

/**
 * The request context. `ResponseHeadersPluginContext` gives procedures a
 * `resHeaders` Headers object so they can set things like `Cache-Control`.
 */
export interface ORPCContext extends ResponseHeadersPluginContext {
  headers: Record<string, string | string[] | undefined>
}

/**
 * `implement(contract)` turns the contract into a type-safe implementer.
 * Every procedure we build below is checked against the contract at compile
 * time AND runtime — the implementation literally cannot drift from the spec.
 */
export const os = implement(contract).$context<ORPCContext>()
