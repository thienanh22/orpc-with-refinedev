import type {
  CreateParams,
  CrudFilters,
  DeleteOneParams,
  GetListParams,
  GetOneParams,
  UpdateParams,
} from '@refinedev/core'
import {
  RPC_BASE,
  assertResource,
  asDataProvider,
  call,
  contractClient,
  toCursor,
  toId,
  unsupported,
  type ContractInputs,
  type ContractOutputs,
  type ResourceDataProvider,
} from './shared'

const RESOURCE = 'planets-v2'

type Planet = ContractOutputs['v2']['planet']['find']
type Climate = NonNullable<ContractInputs['v2']['planet']['list']['climate']>
type CreateInput = ContractInputs['v2']['planet']['create']

// Pull a single `climate` equality filter out of Refine's generic filter array;
// this is the only filter the v2 contract models.
function climateFilter(filters?: CrudFilters): Climate | undefined {
  const f = filters?.find(
    (x): x is Extract<typeof x, { field: string }> => 'field' in x && x.field === 'climate',
  )
  return (f?.value as Climate) || undefined
}

/**
 * Refine provider for the v2 planet resource only.
 *
 * This file maps Refine's "planets-v2" calls onto `contract.v2.planet`.
 */
const provider = {
  getApiUrl: () => RPC_BASE,

  getList: async ({
    resource,
    pagination,
    filters,
  }: GetListParams) => {
    assertResource(resource, RESOURCE)
    const output = await call(() =>
      contractClient.v2.planet.list({
        ...toCursor(pagination),
        climate: climateFilter(filters),
      }),
    )
    return { data: output.items, total: output.total }
  },

  getOne: async ({ resource, id }: GetOneParams) => {
    assertResource(resource, RESOURCE)
    const data = await call(() => contractClient.v2.planet.find({ id: toId(id) }))
    return { data }
  },

  create: async ({
    resource,
    variables,
  }: CreateParams<CreateInput>) => {
    assertResource(resource, RESOURCE)
    const data = await call(() => contractClient.v2.planet.create(variables))
    return { data }
  },

  update: async ({
    resource,
  }: UpdateParams<never>) => {
    assertResource(resource, RESOURCE)
    return unsupported(resource, 'update')
  },

  deleteOne: async ({
    resource,
  }: DeleteOneParams) => {
    assertResource(resource, RESOURCE)
    return unsupported(resource, 'delete')
  },
} satisfies ResourceDataProvider<Planet, CreateInput>

export const planetsV2DataProvider = asDataProvider(provider)
