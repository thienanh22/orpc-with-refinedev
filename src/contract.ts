import { oc } from '@orpc/contract'
import { z } from 'zod'
import {
  CreatePlanetV1Schema,
  CreatePlanetV2Schema,
  ListPlanetV1Schema,
  ListPlanetV2Schema,
  PlanetV1Schema,
  PlanetV2Schema,
} from './schemas.ts'

/**
 * CONTRACT-FIRST.
 *
 * The contract is the single, framework-agnostic description of the API:
 * methods, paths, inputs, outputs, errors. The server must implement it and
 * the client is typed from it. This is what makes versioning tractable: v1 and
 * v2 are two independent contracts that can evolve without touching each other.
 *
 * Note every procedure declares a real HTTP method + a unique URL path. This is
 * the direct answer to the two tRPC pain points:
 *   - GET reads (cacheable) vs POST/PUT/DELETE writes — not "everything POST".
 *   - distinct paths per resource — not one opaque endpoint, so a load balancer
 *     / CDN / WAF can route and cache per route.
 */

const NotFound = {
  NOT_FOUND: {
    message: 'Planet not found',
    data: z.object({ id: z.number() }),
  },
} as const

// ---- v1 contract -------------------------------------------------------

export const v1Contract = {
  planet: {
    list: oc
      .route({ method: 'GET', path: '/api/v1/planets', summary: 'List planets (v1)' })
      .input(ListPlanetV1Schema)
      .output(z.object({ items: z.array(PlanetV1Schema), total: z.number() })),

    find: oc
      .route({ method: 'GET', path: '/api/v1/planets/{id}', summary: 'Get a planet (v1)' })
      .input(z.object({ id: z.coerce.number().int().positive() }))
      .output(PlanetV1Schema)
      .errors(NotFound),

    create: oc
      .route({ method: 'POST', path: '/api/v1/planets', successStatus: 201, summary: 'Create a planet (v1)' })
      .input(CreatePlanetV1Schema)
      .output(PlanetV1Schema),

    update: oc
      .route({ method: 'PUT', path: '/api/v1/planets/{id}', summary: 'Replace a planet (v1)' })
      .input(z.object({ id: z.coerce.number().int().positive() }).and(CreatePlanetV1Schema))
      .output(PlanetV1Schema)
      .errors(NotFound),

    delete: oc
      .route({ method: 'DELETE', path: '/api/v1/planets/{id}', successStatus: 204, summary: 'Delete a planet (v1)' })
      .input(z.object({ id: z.coerce.number().int().positive() }))
      .output(z.void())
      .errors(NotFound),
  },
}

// ---- v2 contract (breaking changes) ------------------------------------

export const v2Contract = {
  planet: {
    list: oc
      .route({ method: 'GET', path: '/api/v2/planets', summary: 'List planets (v2, filter by climate)' })
      .input(ListPlanetV2Schema)
      .output(z.object({ items: z.array(PlanetV2Schema), total: z.number() })),

    find: oc
      .route({ method: 'GET', path: '/api/v2/planets/{id}', summary: 'Get a planet (v2)' })
      .input(z.object({ id: z.coerce.number().int().positive() }))
      .output(PlanetV2Schema)
      .errors(NotFound),

    create: oc
      .route({ method: 'POST', path: '/api/v2/planets', successStatus: 201, summary: 'Create a planet (v2)' })
      .input(CreatePlanetV2Schema)
      .output(PlanetV2Schema),
  },
}

// Combined contract. The nesting keys (v1 / v2 / planet) define the RPC paths;
// the `.route({ path })` above defines the REST/OpenAPI paths.
export const contract = {
  v1: v1Contract,
  v2: v2Contract,
}
