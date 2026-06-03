import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

// Passthrough proxy — no request interception needed for this app.
// This file exists so Next.js doesn't walk up to ../src/middleware.ts
// (the oRPC backend's Express-style middleware), which is not a Next.js file.
export function middleware(_req: NextRequest) {
  return NextResponse.next()
}

export const config = { matcher: [] }
