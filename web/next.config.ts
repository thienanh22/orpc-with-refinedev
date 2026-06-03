import type { NextConfig } from 'next'
import path from 'node:path'

const serverSrc = path.resolve(__dirname, '../src')

const nextConfig: NextConfig = {
  // Keep Next.js scanning within web/ so it doesn't pick up ../src/middleware.ts
  // (the oRPC backend's middleware) as a Next.js middleware file.
  outputFileTracingRoot: path.resolve(__dirname, '../'),
  // Next.js 16 uses Turbopack by default. The @server/* alias lets the oRPC
  // client import the backend router TYPE without bundling any server code.
  turbopack: {
    resolveAlias: {
      '@server': serverSrc,
    },
  },
}

export default nextConfig
