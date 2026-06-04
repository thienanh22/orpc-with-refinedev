import type { CrudFilters, CrudSorting, Pagination } from '@refinedev/core'
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

const RESOURCE = 'stars'

type Star = ContractOutputs['v3']['star']['find']
type StarType = NonNullable<ContractInputs['v3']['star']['list']['type']>
type ListInput = ContractInputs['v3']['star']['list']
type CreateInput = ContractInputs['v3']['star']['create']

// Extract the value of a specific (field, operator) pair from Refine's filter array.
function getFilter(filters: CrudFilters | undefined, field: string, operator: string) {
  return filters?.find(
    (f): f is Extract<typeof f, { field: string }> =>
      'field' in f && f.field === field && f.operator === operator,
  )?.value
}

/**
 * Maps Refine's generic filters/sorters into the oRPC v3 star list input.
 *
 * This is the core of the filter integration test. Each Refine operator maps
 * to a named oRPC input field:
 *
 *  { field: 'name',        operator: 'contains' } → input.name
 *  { field: 'type',        operator: 'eq'       } → input.type
 *  { field: 'constellation', operator: 'eq'     } → input.constellation
 *  { field: 'isVisible',   operator: 'eq'       } → input.isVisible
 *  { field: 'temperature', operator: 'gte'      } → input.temperatureGte
 *  { field: 'temperature', operator: 'lte'      } → input.temperatureLte
 *  { field: 'distanceLy',  operator: 'gte'      } → input.distanceLyGte
 *  { field: 'distanceLy',  operator: 'lte'      } → input.distanceLyLte
 *  sorters[0]                                    → input.sortBy + input.sortOrder
 */
export function buildStarListInput(
  pagination: Pagination | undefined,
  filters: CrudFilters | undefined,
  sorters: CrudSorting | undefined,
): ListInput {
  const isVisibleRaw = getFilter(filters, 'isVisible', 'eq')

  return {
    ...toCursor(pagination),
    name: (getFilter(filters, 'name', 'contains') as string) || undefined,
    type: (getFilter(filters, 'type', 'eq') as StarType) || undefined,
    constellation: (getFilter(filters, 'constellation', 'eq') as string) || undefined,
    isVisible: isVisibleRaw !== undefined && isVisibleRaw !== '' ? Boolean(isVisibleRaw) : undefined,
    temperatureGte: getFilter(filters, 'temperature', 'gte') != null
      ? Number(getFilter(filters, 'temperature', 'gte'))
      : undefined,
    temperatureLte: getFilter(filters, 'temperature', 'lte') != null
      ? Number(getFilter(filters, 'temperature', 'lte'))
      : undefined,
    distanceLyGte: getFilter(filters, 'distanceLy', 'gte') != null
      ? Number(getFilter(filters, 'distanceLy', 'gte'))
      : undefined,
    distanceLyLte: getFilter(filters, 'distanceLy', 'lte') != null
      ? Number(getFilter(filters, 'distanceLy', 'lte'))
      : undefined,
    sortBy: (sorters?.[0]?.field as ListInput['sortBy']) ?? 'name',
    sortOrder: sorters?.[0]?.order ?? 'asc',
  }
}

export const starsDataProvider = createOrpcResourceProvider<
  typeof RESOURCE,
  Star,
  CreateInput
>({
  resource: RESOURCE,

  getList: async ({ pagination, filters, sorters }) => {
    const input = buildStarListInput(pagination, filters, sorters)
    const output = await call(() => contractClient.v3.star.list(input))
    return { data: output.items, total: output.total }
  },

  getOne: async ({ id }) => {
    const data = await call(() => contractClient.v3.star.find({ id: toId(id) }))
    return { data }
  },

  create: async ({ variables }) => {
    const data = await call(() => contractClient.v3.star.create(variables))
    return { data }
  },

  update: async () => unsupported(RESOURCE, 'update'),
  deleteOne: async () => unsupported(RESOURCE, 'delete'),
})
