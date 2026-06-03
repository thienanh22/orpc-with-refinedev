import { createServer } from 'node:http'
import { RPCHandler } from '@orpc/server/node'
import { CORSPlugin, ResponseHeadersPlugin } from '@orpc/server/plugins'
import { OpenAPIHandler } from '@orpc/openapi/node'
import { OpenAPIReferencePlugin } from '@orpc/openapi/plugins'
import { ZodToJsonSchemaConverter } from '@orpc/zod/zod4'
import { router } from './router.ts'
import type { ORPCContext } from './context.ts'

/**
 * One router, two transports, served from the same process:
 *
 *  - OpenAPIHandler  -> RESTful HTTP (real verbs + unique URLs) at /api/**,
 *                       plus interactive docs at /docs and the spec at /spec.json
 *  - RPCHandler      -> compact oRPC protocol at /rpc/** for TS<->TS callers
 *
 * Pick REST for cache/LB/3rd-party friendliness, RPC for max-efficiency
 * internal calls. Same procedures, same validation, same types.
 */

const openapiHandler = new OpenAPIHandler(router, {
  plugins: [
    new CORSPlugin(),
    new ResponseHeadersPlugin(), // lets procedures set Cache-Control etc.
    new OpenAPIReferencePlugin({
      schemaConverters: [new ZodToJsonSchemaConverter()],
      docsPath: '/docs',
      specPath: '/spec.json',
      specGenerateOptions: {
        info: { title: 'oRPC Planet API', version: '1.0.0' },
        servers: [{ url: 'http://localhost:3000', description: 'local' }],
      },
    }),
  ],
})

const rpcHandler = new RPCHandler(router, {
  plugins: [new CORSPlugin(), new ResponseHeadersPlugin()],
})

function buildContext(req: { headers: Record<string, string | string[] | undefined> }): ORPCContext {
  return { headers: req.headers }
}

const server = createServer(async (req, res) => {
  const url = req.url ?? '/'

  // Route by transport. /rpc -> RPC protocol, everything else -> OpenAPI/REST.
  if (url.startsWith('/rpc')) {
    const { matched } = await rpcHandler.handle(req, res, {
      prefix: '/rpc',
      context: buildContext(req),
    })
    if (matched) return
  } else {
    const { matched } = await openapiHandler.handle(req, res, {
      context: buildContext(req),
    })
    if (matched) return
  }

  res.statusCode = 404
  res.end('Not found')
})

const PORT = 3000
server.listen(PORT, () => {
  console.log(`oRPC POC listening on http://localhost:${PORT}`)
  console.log(`  REST    : http://localhost:${PORT}/api/v1/planets`)
  console.log(`  Docs    : http://localhost:${PORT}/docs   (Scalar UI)`)
  console.log(`  Spec    : http://localhost:${PORT}/spec.json`)
  console.log(`  RPC     : http://localhost:${PORT}/rpc/v1/planet/list`)
})
