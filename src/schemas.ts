import { z } from 'zod'

/**
 * Shared Zod schemas. These drive BOTH:
 *  - runtime input/output validation, and
 *  - the generated OpenAPI 3.1 JSON Schemas.
 * One source of truth -> no drift between docs, validation, and types.
 */

// ---- v1 ----------------------------------------------------------------

export const PlanetV1Schema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1),
  // v1 exposes a single free-text field for the climate.
  description: z.string().nullable(),
})

export const CreatePlanetV1Schema = z.object({
  name: z.string().min(1),
  description: z.string().nullable().optional(),
})

export const ListPlanetV1Schema = z.object({
  // GET query params -> still validated & typed.
  limit: z.coerce.number().int().min(1).max(100).default(10),
  cursor: z.coerce.number().int().min(0).default(0),
})

export type PlanetV1 = z.infer<typeof PlanetV1Schema>

// ---- v2 (breaking change) ---------------------------------------------
// Demonstrates API versioning: `description` is replaced by a structured
// `climate` enum + a required `discoveredYear`. Old clients keep hitting v1.

export const ClimateSchema = z.enum(['temperate', 'arid', 'frozen', 'gas', 'unknown'])

export const PlanetV2Schema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1),
  climate: ClimateSchema,
  discoveredYear: z.number().int(),
})

export const CreatePlanetV2Schema = z.object({
  name: z.string().min(1),
  climate: ClimateSchema.default('unknown'),
  discoveredYear: z.number().int(),
})

export const ListPlanetV2Schema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(10),
  cursor: z.coerce.number().int().min(0).default(0),
  climate: ClimateSchema.optional(),
})

export type PlanetV2 = z.infer<typeof PlanetV2Schema>
