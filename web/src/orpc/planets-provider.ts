import type {
  CreateParams,
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
  type ContractInputs,
  type ContractOutputs,
  type ResourceDataProvider,
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
const provider = {
  getApiUrl: () => RPC_BASE,

  getList: async ({ resource, pagination }: GetListParams) => {
    assertResource(resource, RESOURCE)
    const { items, total } = await call(() => contractClient.v1.planet.list(toCursor(pagination)))
    return { data: items, total }
  },

  getOne: async ({ resource, id }: GetOneParams) => {
    assertResource(resource, RESOURCE)
    const data = await call(() => contractClient.v1.planet.find({ id: toId(id) }))
    return { data }
  },

  create: async ({
    resource,
    variables,
  }: CreateParams<CreateInput>) => {
    assertResource(resource, RESOURCE)
    const data = await call(() => contractClient.v1.planet.create(variables))
    return { data }
  },

  update: async ({
    resource,
    id,
    variables,
  }: UpdateParams<UpdateInput>) => {
    assertResource(resource, RESOURCE)
    const data = await call(() =>
      contractClient.v1.planet.update({
        id: toId(id),
        ...variables,
      }),
    )
    return { data }
  },

  deleteOne: async ({
    resource,
    id,
  }: DeleteOneParams) => {
    assertResource(resource, RESOURCE)
    await call(() => contractClient.v1.planet.delete({ id: toId(id) }))
    // delete returns void in the contract; echo the id back for Refine.
    return { data: { id } }
  },
} satisfies ResourceDataProvider<Planet, CreateInput, UpdateInput>

export const planetsDataProvider = asDataProvider(provider)
