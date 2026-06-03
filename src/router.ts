import { db, type PlanetRow } from './db.ts'
import { os } from './context.ts'
import { cache, logger, requireAuth } from './middleware.ts'

// Shape mappers: one row -> the version-specific output shape.
const toV1 = (r: PlanetRow) => ({ id: r.id, name: r.name, description: r.description })
const toV2 = (r: PlanetRow) => ({
  id: r.id,
  name: r.name,
  climate: r.climate,
  discoveredYear: r.discoveredYear,
})

// =========================================================================
// v1 implementation
// =========================================================================

const v1 = {
  planet: {
    // GET -> cacheable for 60s.
    list: os.v1.planet.list
      .use(logger)
      .use(cache(60))
      .handler(({ input }) => {
        const items = db.list(input.cursor, input.limit).map(toV1)
        return { items, total: db.count() }
      }),

    find: os.v1.planet.find
      .use(logger)
      .use(cache(60))
      .handler(({ input, errors }) => {
        const row = db.find(input.id)
        if (!row) throw errors.NOT_FOUND({ data: { id: input.id } })
        return toV1(row)
      }),

    // Mutations require auth, and are NOT cached.
    create: os.v1.planet.create
      .use(logger)
      .use(requireAuth)
      .handler(({ input }) => {
        const row = db.create({
          name: input.name,
          description: input.description ?? null,
          climate: 'unknown',
          discoveredYear: 0,
        })
        return toV1(row)
      }),

    update: os.v1.planet.update
      .use(logger)
      .use(requireAuth)
      .handler(({ input, errors }) => {
        const row = db.update(input.id, {
          name: input.name,
          description: input.description ?? null,
        })
        if (!row) throw errors.NOT_FOUND({ data: { id: input.id } })
        return toV1(row)
      }),

    delete: os.v1.planet.delete
      .use(logger)
      .use(requireAuth)
      .handler(({ input, errors }) => {
        const ok = db.remove(input.id)
        if (!ok) throw errors.NOT_FOUND({ data: { id: input.id } })
      }),
  },
}

// =========================================================================
// v2 implementation (new shape + climate filter; reuses the same store)
// =========================================================================

const v2 = {
  planet: {
    list: os.v2.planet.list
      .use(logger)
      .use(cache(60))
      .handler(({ input }) => {
        let rows = db.list(input.cursor, input.limit)
        if (input.climate) rows = rows.filter((r) => r.climate === input.climate)
        return { items: rows.map(toV2), total: db.count() }
      }),

    find: os.v2.planet.find
      .use(logger)
      .use(cache(60))
      .handler(({ input, errors }) => {
        const row = db.find(input.id)
        if (!row) throw errors.NOT_FOUND({ data: { id: input.id } })
        return toV2(row)
      }),

    create: os.v2.planet.create
      .use(logger)
      .use(requireAuth)
      .handler(({ input }) => {
        const row = db.create({
          name: input.name,
          description: null,
          climate: input.climate,
          discoveredYear: input.discoveredYear,
        })
        return toV2(row)
      }),
  },
}

// The final router implements the whole contract (compile-time enforced).
export const router = os.router({ v1, v2 })
