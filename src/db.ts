/**
 * Tiny in-memory "database". v2 derives its richer shape from this same store,
 * so both API versions are backed by one dataset.
 */

interface PlanetRow {
  id: number
  name: string
  description: string | null
  climate: 'temperate' | 'arid' | 'frozen' | 'gas' | 'unknown'
  discoveredYear: number
}

let nextId = 4
const rows: PlanetRow[] = [
  { id: 1, name: 'Earth', description: 'Pale blue dot', climate: 'temperate', discoveredYear: -4000 },
  { id: 2, name: 'Mars', description: 'The red one', climate: 'arid', discoveredYear: 1610 },
  { id: 3, name: 'Jupiter', description: 'Big gas giant', climate: 'gas', discoveredYear: 1610 },
]

export const db = {
  list(offset: number, limit: number) {
    return rows.slice(offset, offset + limit)
  },
  count() {
    return rows.length
  },
  find(id: number) {
    return rows.find((r) => r.id === id)
  },
  create(data: Omit<PlanetRow, 'id'>) {
    const row: PlanetRow = { id: nextId++, ...data }
    rows.push(row)
    return row
  },
  update(id: number, data: Partial<Omit<PlanetRow, 'id'>>) {
    const row = rows.find((r) => r.id === id)
    if (!row) return undefined
    Object.assign(row, data)
    return row
  },
  remove(id: number) {
    const idx = rows.findIndex((r) => r.id === id)
    if (idx === -1) return false
    rows.splice(idx, 1)
    return true
  },
}

export type { PlanetRow }
