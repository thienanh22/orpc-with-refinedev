'use client'

import { Suspense } from 'react'
import { PlanetV2List } from '@/features/planets-v2/list'

export default function PlanetsV2Page() {
  return <Suspense><PlanetV2List /></Suspense>
}
