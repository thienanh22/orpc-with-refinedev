import { Suspense } from 'react'
import type { Metadata } from 'next'
import { ClientToaster } from '@/components/client-toaster'
import { RefineProviders } from '@/providers/refine'
import './globals.css'

export const metadata: Metadata = {
  title: 'oRPC × Refine',
  description: 'Headless Refine admin backed by oRPC',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {/* Suspense here covers Refine's internal useSearchParams (Telemetry)
            across all routes — required by Next.js App Router during SSR. */}
        <Suspense>
          <RefineProviders>
            <div className="min-h-svh bg-background text-foreground">
              {children}
            </div>
          </RefineProviders>
        </Suspense>
        <ClientToaster />
      </body>
    </html>
  )
}
