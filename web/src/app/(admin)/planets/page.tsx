'use client'

import { Suspense } from 'react'
import { PlanetList } from '@/features/planets'

export default function PlanetsPage() {
  return <Suspense><PlanetList /></Suspense>
}
