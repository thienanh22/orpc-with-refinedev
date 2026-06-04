'use client'

import { Suspense } from 'react'
import { StarList } from '@/features/stars/list'

export default function StarsPage() {
  return (
    <Suspense>
      <StarList />
    </Suspense>
  )
}
