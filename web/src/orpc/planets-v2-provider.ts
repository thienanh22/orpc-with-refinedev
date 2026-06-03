import type { CrudFilters } from '@refinedev/core'
import {
  call,
  contractClient,
  createOrpcResourceProvider,
  toCursor,
  toId,
  unsupported,
  type ContractInputs,
  type ContractOutputs,
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
export const planetsV2DataProvider = createOrpcResourceProvider<
  typeof RESOURCE,
  Planet,
  CreateInput
>({
  resource: RESOURCE,

  getList: async ({ pagination, filters }) => {
    const output = await call(() =>
      contractClient.v2.planet.list({
        ...toCursor(pagination),
        climate: climateFilter(filters),
      }),
    )
    return { data: output.items, total: output.total }
  },

  getOne: async ({ id }) => {
    const data = await call(() => contractClient.v2.planet.find({ id: toId(id) }))
    return { data }
  },

  create: async ({ variables }) => {
    const data = await call(() => contractClient.v2.planet.create(variables))
    return { data }
  },

  update: async () => {
    return unsupported(RESOURCE, 'update')
  },

  deleteOne: async () => {
    return unsupported(RESOURCE, 'delete')
  },
})
