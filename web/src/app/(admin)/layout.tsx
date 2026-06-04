import Link from 'next/link'
import { cn } from '@/lib/utils'

// Force dynamic rendering: this is a client-side admin app backed by live API
// calls. Static prerendering is neither useful nor possible (Refine hooks use
// useSearchParams for URL sync, which requires a Suspense boundary at build).
export const dynamic = 'force-dynamic'

const links = [
  { href: '/planets', label: 'Planets (v1)' },
  { href: '/planets-v2', label: 'Planets (v2)' },
  { href: '/stars', label: 'Stars (v3)' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-6 px-4">
          <span className="font-semibold tracking-tight">🪐 oRPC × Refine</span>
          <nav className="flex items-center gap-1">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  'rounded-md px-3 py-1.5 text-sm transition-colors hover:bg-accent',
                )}
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  )
}
