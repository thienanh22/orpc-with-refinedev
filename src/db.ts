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

// ---- Stars DB --------------------------------------------------------------

interface StarRow {
  id: number
  name: string
  type: 'O' | 'B' | 'A' | 'F' | 'G' | 'K' | 'M'
  temperature: number // Kelvin
  distanceLy: number // light-years
  constellation: string
  isVisible: boolean
}

let nextStarId = 24
const starRows: StarRow[] = [
  { id: 1, name: 'Sun', type: 'G', temperature: 5778, distanceLy: 0.000016, constellation: 'N/A', isVisible: true },
  { id: 2, name: 'Proxima Centauri', type: 'M', temperature: 3042, distanceLy: 4.24, constellation: 'Centaurus', isVisible: false },
  { id: 3, name: 'Alpha Centauri A', type: 'G', temperature: 5790, distanceLy: 4.37, constellation: 'Centaurus', isVisible: true },
  { id: 4, name: 'Alpha Centauri B', type: 'K', temperature: 5260, distanceLy: 4.37, constellation: 'Centaurus', isVisible: true },
  { id: 5, name: 'Barnard\'s Star', type: 'M', temperature: 3134, distanceLy: 5.96, constellation: 'Ophiuchus', isVisible: false },
  { id: 6, name: 'Sirius A', type: 'A', temperature: 9940, distanceLy: 8.6, constellation: 'Canis Major', isVisible: true },
  { id: 7, name: 'Epsilon Eridani', type: 'K', temperature: 5084, distanceLy: 10.5, constellation: 'Eridanus', isVisible: true },
  { id: 8, name: 'Tau Ceti', type: 'G', temperature: 5344, distanceLy: 11.9, constellation: 'Cetus', isVisible: true },
  { id: 9, name: 'Procyon A', type: 'F', temperature: 6530, distanceLy: 11.46, constellation: 'Canis Minor', isVisible: true },
  { id: 10, name: 'Vega', type: 'A', temperature: 9602, distanceLy: 25.04, constellation: 'Lyra', isVisible: true },
  { id: 11, name: 'Arcturus', type: 'K', temperature: 4286, distanceLy: 36.7, constellation: 'Boötes', isVisible: true },
  { id: 12, name: 'Capella A', type: 'G', temperature: 4970, distanceLy: 42.9, constellation: 'Auriga', isVisible: true },
  { id: 13, name: 'Rigel', type: 'B', temperature: 12100, distanceLy: 860, constellation: 'Orion', isVisible: true },
  { id: 14, name: 'Betelgeuse', type: 'M', temperature: 3500, distanceLy: 700, constellation: 'Orion', isVisible: true },
  { id: 15, name: 'Aldebaran', type: 'K', temperature: 3910, distanceLy: 65.3, constellation: 'Taurus', isVisible: true },
  { id: 16, name: 'Antares', type: 'M', temperature: 3400, distanceLy: 550, constellation: 'Scorpius', isVisible: true },
  { id: 17, name: 'Spica', type: 'B', temperature: 25300, distanceLy: 250, constellation: 'Virgo', isVisible: true },
  { id: 18, name: 'Pollux', type: 'K', temperature: 4865, distanceLy: 33.9, constellation: 'Gemini', isVisible: true },
  { id: 19, name: 'Fomalhaut', type: 'A', temperature: 8590, distanceLy: 25.13, constellation: 'Piscis Austrinus', isVisible: true },
  { id: 20, name: 'Deneb', type: 'A', temperature: 8525, distanceLy: 2600, constellation: 'Cygnus', isVisible: true },
  { id: 21, name: 'Regulus', type: 'B', temperature: 12460, distanceLy: 79.3, constellation: 'Leo', isVisible: true },
  { id: 22, name: 'Canopus', type: 'A', temperature: 7350, distanceLy: 310, constellation: 'Carina', isVisible: true },
  { id: 23, name: 'Polaris', type: 'F', temperature: 5998, distanceLy: 433, constellation: 'Ursa Minor', isVisible: true },
]

export const starsDb = {
  all(): StarRow[] {
    return [...starRows]
  },
  find(id: number): StarRow | undefined {
    return starRows.find((r) => r.id === id)
  },
  create(data: Omit<StarRow, 'id'>): StarRow {
    const row: StarRow = { id: nextStarId++, ...data }
    starRows.push(row)
    return row
  },
}

export type { StarRow }
