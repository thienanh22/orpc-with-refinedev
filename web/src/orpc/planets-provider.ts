import {
  call,
  contractClient,
  createOrpcResourceProvider,
  toCursor,
  toId,
  type ContractInputs,
  type ContractOutputs,
} from './shared'

const RESOURCE = 'planets'
type Planet = ContractOutputs['v1']['planet']['find']
type CreateInput = ContractInputs['v1']['planet']['create']
type UpdateInput = Omit<ContractInputs['v1']['planet']['update'], 'id'>

/**
 * Refine provider for the v1 planet resource only.
 *
 * This file maps Refine's "planets" CRUD calls onto `contract.v1.planet`.
 */
export const planetsDataProvider = createOrpcResourceProvider<
  typeof RESOURCE,
  Planet,
  CreateInput,
  UpdateInput
>({
  resource: RESOURCE,

  getList: async ({ pagination }) => {
    const { items, total } = await call(() => contractClient.v1.planet.list(toCursor(pagination)))
    return { data: items, total }
  },

  getOne: async ({ id }) => {
    const data = await call(() => contractClient.v1.planet.find({ id: toId(id) }))
    return { data }
  },

  create: async ({ variables }) => {
    const data = await call(() => contractClient.v1.planet.create(variables))
    return { data }
  },

  update: async ({ id, variables }) => {
    const data = await call(() =>
      contractClient.v1.planet.update({
        id: toId(id),
        ...variables,
      }),
    )
    return { data }
  },

  deleteOne: async ({ id }) => {
    await call(() => contractClient.v1.planet.delete({ id: toId(id) }))
    // delete returns void in the contract; echo the id back for Refine.
    return { data: { id } }
  },
})
