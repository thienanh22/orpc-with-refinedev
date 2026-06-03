import { writeFile } from 'node:fs/promises'
import { OpenAPIGenerator } from '@orpc/openapi'
import { ZodToJsonSchemaConverter } from '@orpc/zod/zod4'
import { contract } from './contract.ts'

/**
 * Generate a static OpenAPI 3.1 document straight from the contract.
 *
 * Run: `pnpm gen:openapi` -> writes ./openapi.json
 *
 * This file is your CLIENT-GENERATION input. Any OpenAPI codegen tool can
 * consume it to emit SDKs in any language:
 *   - TS:   npx openapi-typescript openapi.json -o client-types.ts
 *   - Multi: orval / openapi-generator-cli / Speakeasy / Fern, etc.
 *
 * Because it is generated from the contract, the spec can never drift from the
 * running server. (For an internal TS client you usually skip codegen entirely
 * and use oRPC's typed link instead — see src/client.ts.)
 */

const generator = new OpenAPIGenerator({
  schemaConverters: [new ZodToJsonSchemaConverter()],
})

const spec = await generator.generate(contract, {
  info: {
    title: 'oRPC Planet API',
    version: '1.0.0',
    description: 'POC demonstrating versioned, cacheable, REST-mapped oRPC procedures.',
  },
  servers: [{ url: 'http://localhost:3000', description: 'local' }],
})

await writeFile('openapi.json', JSON.stringify(spec, null, 2))

const paths = Object.keys(spec.paths ?? {})
console.log(`Wrote openapi.json with ${paths.length} paths:`)
for (const p of paths) {
  const methods = Object.keys((spec.paths as Record<string, object>)[p]).join(', ').toUpperCase()
  console.log(`  ${methods.padEnd(20)} ${p}`)
}
