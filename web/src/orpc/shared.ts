import type {
  BaseKey,
  BaseRecord,
  CreateParams,
  CreateResponse,
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
import { ORPCError } from '@orpc/client'
import type {
  ContractRouterClient,
  InferContractRouterInputs,
  InferContractRouterOutputs,
} from '@orpc/contract'
import type { contract } from '@server/contract'
import { orpc } from './client'

export const RPC_BASE = process.env.NEXT_PUBLIC_ORPC_URL ?? 'http://localhost:3000/rpc'

export type ContractInputs = InferContractRouterInputs<typeof contract>
export type ContractOutputs = InferContractRouterOutputs<typeof contract>

type ParamsWithoutResource<TParams extends { resource: string }> = Omit<TParams, 'resource'>

export type OrpcResourceProviderConfig<
  TResource extends string,
  TRecord extends BaseRecord,
  TCreateVariables,
  TUpdateVariables = never,
  TDeleteRecord extends BaseRecord = { id: BaseKey },
> = {
  resource: TResource
  getList: (
    params: ParamsWithoutResource<GetListParams>,
  ) => Promise<GetListResponse<TRecord>>
  getOne: (
    params: ParamsWithoutResource<GetOneParams>,
  ) => Promise<GetOneResponse<TRecord>>
  create: (
    params: ParamsWithoutResource<CreateParams<TCreateVariables>>,
  ) => Promise<CreateResponse<TRecord>>
  update: (
    params: ParamsWithoutResource<UpdateParams<TUpdateVariables>>,
  ) => Promise<UpdateResponse<TRecord>>
  deleteOne: (
    params: ParamsWithoutResource<DeleteOneParams>,
  ) => Promise<DeleteOneResponse<TDeleteRecord>>
}

export type ResourceDataProvider<
  TRecord extends BaseRecord,
  TCreateVariables,
  TUpdateVariables = never,
  TDeleteRecord extends BaseRecord = { id: BaseKey },
> = {
  getApiUrl: () => string
  getList: (params: GetListParams) => Promise<GetListResponse<TRecord>>
  getOne: (params: GetOneParams) => Promise<GetOneResponse<TRecord>>
  create: (
    params: CreateParams<TCreateVariables>,
  ) => Promise<CreateResponse<TRecord>>
  update: (
    params: UpdateParams<TUpdateVariables>,
  ) => Promise<UpdateResponse<TRecord>>
  deleteOne: (params: DeleteOneParams) => Promise<DeleteOneResponse<TDeleteRecord>>
}

function withoutResource<TParams extends { resource: string }>(params: TParams) {
  const { resource: _resource, ...rest } = params
  return rest
}

/**
 * Create a Refine DataProvider for exactly one oRPC-backed resource.
 *
 * Resource-specific files provide the contract-derived record/input types,
 * while this helper supplies the common Refine adapter shape.
 */
export function createOrpcResourceProvider<
  TResource extends string,
  TRecord extends BaseRecord,
  TCreateVariables,
  TUpdateVariables = never,
  TDeleteRecord extends BaseRecord = { id: BaseKey },
>(
  config: OrpcResourceProviderConfig<
    TResource,
    TRecord,
    TCreateVariables,
    TUpdateVariables,
    TDeleteRecord
  >,
) {
  const provider: ResourceDataProvider<
    TRecord,
    TCreateVariables,
    TUpdateVariables,
    TDeleteRecord
  > = {
    getApiUrl: () => RPC_BASE,

    getList: async (params) => {
      assertResource(params.resource, config.resource)
      return config.getList(withoutResource(params))
    },

    getOne: async (params) => {
      assertResource(params.resource, config.resource)
      return config.getOne(withoutResource(params))
    },

    create: async (params) => {
      assertResource(params.resource, config.resource)
      return config.create(withoutResource(params))
    },

    update: async (params) => {
      assertResource(params.resource, config.resource)
      return config.update(withoutResource(params))
    },

    deleteOne: async (params) => {
      assertResource(params.resource, config.resource)
      return config.deleteOne(withoutResource(params))
    },
  }

  // Refine's DataProvider type is intentionally generic at the hook boundary.
  // This cast is the boundary from a concrete resource provider to Refine's API.
  return provider as DataProvider
}

export const contractClient: ContractRouterClient<typeof contract> = orpc

// Refine BaseKey is string | number; the contract wants a positive integer.
export const toId = (id: BaseKey) => Number(id)

// Refine pagination (1-based currentPage/pageSize) -> oRPC offset (cursor/limit).
export function toCursor(pagination?: Pagination) {
  const currentPage = pagination?.currentPage ?? 1
  const pageSize = pagination?.pageSize ?? 10
  return { cursor: (currentPage - 1) * pageSize, limit: pageSize }
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

export function unknownResource(resource: string): never {
  throw toHttpError(new Error(`Unknown resource: ${resource}`))
}

export function unsupported(resource: string, action: string): never {
  throw {
    message: `"${action}" is not supported for resource "${resource}"`,
    statusCode: 405,
  } satisfies HttpError
}

export function assertResource(resource: string, expected: string) {
  if (resource !== expected) return unknownResource(resource)
}
