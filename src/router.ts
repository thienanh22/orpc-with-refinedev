import { db, starsDb, type PlanetRow, type StarRow } from './db.ts'
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

// =========================================================================
// v3 implementation (stars — demonstrates all Refine filter operator types)
// =========================================================================

const toStar = (r: StarRow) => ({
  id: r.id,
  name: r.name,
  type: r.type,
  temperature: r.temperature,
  distanceLy: r.distanceLy,
  constellation: r.constellation,
  isVisible: r.isVisible,
})

const v3 = {
  star: {
    list: os.v3.star.list
      .use(logger)
      .use(cache(60))
      .handler(({ input }) => {
        let rows = starsDb.all()

        // text search (contains, case-insensitive)
        if (input.name) {
          const q = input.name.toLowerCase()
          rows = rows.filter((r) => r.name.toLowerCase().includes(q))
        }
        // enum filter
        if (input.type) rows = rows.filter((r) => r.type === input.type)
        // string enum filter
        if (input.constellation) rows = rows.filter((r) => r.constellation === input.constellation)
        // boolean filter
        if (input.isVisible !== undefined) rows = rows.filter((r) => r.isVisible === input.isVisible)
        // numeric range filters
        if (input.temperatureGte !== undefined) rows = rows.filter((r) => r.temperature >= input.temperatureGte!)
        if (input.temperatureLte !== undefined) rows = rows.filter((r) => r.temperature <= input.temperatureLte!)
        if (input.distanceLyGte !== undefined) rows = rows.filter((r) => r.distanceLy >= input.distanceLyGte!)
        if (input.distanceLyLte !== undefined) rows = rows.filter((r) => r.distanceLy <= input.distanceLyLte!)

        const total = rows.length

        // sorting
        const { sortBy, sortOrder } = input
        rows = [...rows].sort((a, b) => {
          const av = a[sortBy]
          const bv = b[sortBy]
          const cmp = av < bv ? -1 : av > bv ? 1 : 0
          return sortOrder === 'desc' ? -cmp : cmp
        })

        // pagination
        const items = rows.slice(input.cursor, input.cursor + input.limit).map(toStar)
        return { items, total }
      }),

    find: os.v3.star.find
      .use(logger)
      .use(cache(60))
      .handler(({ input, errors }) => {
        const row = starsDb.find(input.id)
        if (!row) throw errors.NOT_FOUND({ data: { id: input.id } })
        return toStar(row)
      }),

    create: os.v3.star.create
      .use(logger)
      .use(requireAuth)
      .handler(({ input }) => {
        const row = starsDb.create({
          name: input.name,
          type: input.type,
          temperature: input.temperature,
          distanceLy: input.distanceLy,
          constellation: input.constellation,
          isVisible: input.isVisible,
        })
        return toStar(row)
      }),
  },
}

// The final router implements the whole contract (compile-time enforced).
export const router = os.router({ v1, v2, v3 })
