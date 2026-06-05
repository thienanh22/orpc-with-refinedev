import { ORPCError } from '@orpc/client'
import type { ContractRouterClient } from '@orpc/contract'
import type {
  BaseKey,
  BaseRecord,
  CreateParams,
  CreateResponse,
  CrudFilters,
  CrudSorting,
  DataProvider,
  DeleteOneParams,
  DeleteOneResponse,
  GetListParams,
  GetListResponse,
  GetOneParams,
  GetOneResponse,
  HttpError,
  Pagination,
  UpdateParams,
  UpdateResponse,
} from '@refinedev/core'
import type { contract } from '@server/contract'
import { orpc } from './client'

export const RPC_BASE = process.env.NEXT_PUBLIC_ORPC_URL ?? 'http://localhost:3000/rpc'

// Compile-time assertion that the runtime client conforms to the contract.
export const contractClient: ContractRouterClient<typeof contract> = orpc

/**
 * CRUD-BY-CONVENTION.
 *
 * One generic Refine DataProvider for every oRPC resource. It works because
 * the contract is uniform — each resource exposes:
 *
 *   list({ cursor, limit, ...namedFilters }) -> { items, total }
 *   find({ id })                             -> record
 *   create(variables)                        -> record
 *   update({ id, ...variables })             -> record   (optional)
 *   delete({ id })                           -> void     (optional)
 *
 * and list filters follow a naming convention (see `toListInput`):
 *
 *   { field, operator: 'eq' | 'contains' } -> input[field]
 *   { field, operator: 'gte' }             -> input[`${field}Gte`]
 *   { field, operator: 'lte' }             -> input[`${field}Lte`]
 *   sorters[0]                             -> input.sortBy + input.sortOrder
 *
 * Per-resource code disappears entirely: a resource is one registry entry
 * (`createOrpcDataProvider` call site) mapping its Refine name to a contract
 * sub-router. The price is that the convention is now an implicit agreement
 * between the zod list schemas and this file — a resource that breaks it
 * cannot be expressed without an escape hatch.
 */

/** Structural shape every conventional CRUD sub-router of the contract satisfies. */
export type CrudClient = {
  // Method shorthand (not arrow properties) so members are bivariant and the
  // concrete contract clients (narrower inputs, wider outputs) assign cleanly.
  list(input: Record<string, unknown>): Promise<{ items: BaseRecord[]; total: number }>
  find(input: { id: number }): Promise<BaseRecord>
  create(input: Record<string, unknown>): Promise<BaseRecord>
  // Update inputs are `{ id } & <resource-specific variables>` — there is no
  // common parameter type every contract update accepts, so declare `never`
  // (assignable-to-anything) and cast at the one dispatch call site.
  update?(input: never): Promise<BaseRecord>
  delete?(input: { id: number }): Promise<unknown>
}

export type CrudAction = 'list' | 'find' | 'create' | 'update' | 'delete'

export type ResourceConfig = {
  client: CrudClient
  /**
   * Actions this resource supports. Must be explicit: the oRPC client is a
   * lazy proxy, so `client.update` exists at runtime even when the contract
   * has no such procedure — it cannot be introspected. (Deriving this from
   * the contract value would work, but the web app deliberately imports the
   * contract type-only to keep server schemas out of the bundle.)
   */
  actions: readonly CrudAction[]
}

// Refine BaseKey is string | number; the contract wants a positive integer.
export const toId = (id: BaseKey) => Number(id)

// Refine pagination (1-based currentPage/pageSize) -> oRPC offset (cursor/limit).
export function toCursor(pagination?: Pagination) {
  const currentPage = pagination?.currentPage ?? 1
  const pageSize = pagination?.pageSize ?? 10
  return { cursor: (currentPage - 1) * pageSize, limit: pageSize }
}

/**
 * Map Refine's generic pagination/filters/sorters onto a conventional oRPC
 * list input. Filter values pass through raw — the server's zod schemas
 * coerce (z.coerce.number/boolean) and strip unknown keys. Operators outside
 * the convention (ne, in, or, ...) are ignored, as are empty values.
 */
export function toListInput(
  pagination?: Pagination,
  filters?: CrudFilters,
  sorters?: CrudSorting,
) {
  const input: Record<string, unknown> = { ...toCursor(pagination) }
  for (const f of filters ?? []) {
    if (!('field' in f) || f.value === undefined || f.value === '') continue
    switch (f.operator) {
      case 'eq':
      case 'contains':
        input[f.field] = f.value
        break
      case 'gte':
        input[`${f.field}Gte`] = f.value
        break
      case 'lte':
        input[`${f.field}Lte`] = f.value
        break
    }
  }
  // Omit sort keys when unsorted so the server-side schema defaults apply.
  if (sorters?.[0]) {
    input.sortBy = sorters[0].field
    input.sortOrder = sorters[0].order
  }
  return input
}

// oRPC throws typed ORPCError; Refine wants HttpError ({ message, statusCode }).
export function toHttpError(e: unknown): HttpError {
  if (e instanceof ORPCError) {
    return {
      message: e.message,
      statusCode: e.status,
      data: e.data,
    }
  }
  const message = e instanceof Error ? e.message : 'Unexpected error'
  return { message, statusCode: 500 }
}

// Run an oRPC call and normalize any failure into a Refine HttpError.
export async function call<TResult>(fn: () => TResult): Promise<Awaited<TResult>> {
  try {
    return await fn()
  } catch (e) {
    throw toHttpError(e)
  }
}

function unknownResource(resource: string): never {
  throw toHttpError(new Error(`Unknown resource: ${resource}`))
}

function unsupported(resource: string, action: string): never {
  throw {
    message: `"${action}" is not supported for resource "${resource}"`,
    statusCode: 405,
  } satisfies HttpError
}

// Refine's DataProvider methods are generic per call site; the generic
// provider works in BaseRecord terms and casts at the boundary (see below).
type BaseDataProvider = {
  getApiUrl: () => string
  getList: (params: GetListParams) => Promise<GetListResponse<BaseRecord>>
  getOne: (params: GetOneParams) => Promise<GetOneResponse<BaseRecord>>
  create: (params: CreateParams<unknown>) => Promise<CreateResponse<BaseRecord>>
  update: (params: UpdateParams<unknown>) => Promise<UpdateResponse<BaseRecord>>
  deleteOne: (params: DeleteOneParams) => Promise<DeleteOneResponse<{ id: BaseKey }>>
}

/** One generic Refine DataProvider dispatching on `params.resource`. */
export function createOrpcDataProvider(
  resources: Record<string, ResourceConfig>,
): DataProvider {
  const resolve = (resource: string, action: CrudAction): CrudClient => {
    const config = resources[resource] ?? unknownResource(resource)
    if (!config.actions.includes(action)) unsupported(resource, action)
    return config.client
  }

  const provider: BaseDataProvider = {
    getApiUrl: () => RPC_BASE,

    // Note: resolve() runs OUTSIDE call() — it throws ready-made HttpErrors
    // (unknown resource / unsupported action) that must not be re-wrapped.

    getList: async ({ resource, pagination, filters, sorters }) => {
      const client = resolve(resource, 'list')
      const { items, total } = await call(() =>
        client.list(toListInput(pagination, filters, sorters)),
      )
      return { data: items, total }
    },

    getOne: async ({ resource, id }) => {
      const client = resolve(resource, 'find')
      const data = await call(() => client.find({ id: toId(id) }))
      return { data }
    },

    create: async ({ resource, variables }) => {
      const client = resolve(resource, 'create')
      const data = await call(() => client.create(variables as Record<string, unknown>))
      return { data }
    },

    update: async ({ resource, id, variables }) => {
      const client = resolve(resource, 'update')
      const data = await call(() =>
        client.update!({
          id: toId(id),
          ...(variables as Record<string, unknown>),
        } as never),
      )
      return { data }
    },

    deleteOne: async ({ resource, id }) => {
      const client = resolve(resource, 'delete')
      await call(() => client.delete!({ id: toId(id) }))
      // delete returns void in the contract; echo the id back for Refine.
      return { data: { id } }
    },
  }

  // Refine's DataProvider type is intentionally generic at the hook boundary.
  // This cast is the boundary from BaseRecord results to Refine's API.
  return provider as DataProvider
}
