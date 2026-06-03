'use client'

import { Suspense } from 'react'
import { PlanetShow } from '@/features/planets'

export default function PlanetShowPage() {
  return <Suspense><PlanetShow /></Suspense>
}
