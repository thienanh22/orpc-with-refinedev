'use client'

import { useShow, useNavigation, type HttpError } from '@refinedev/core'
import type { PlanetV1 } from '@server/schemas'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export function PlanetShow() {
  const { query } = useShow<PlanetV1, HttpError>({ resource: 'planets' })
  const { list, edit } = useNavigation()
  const planet = query.data?.data

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={() => list('planets')}>
        ← Back to planets
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>
            {query.isLoading ? <Skeleton className="h-7 w-40" /> : planet?.name}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {query.isLoading ? (
            <Skeleton className="h-20 w-full" />
          ) : planet ? (
            <dl className="grid grid-cols-[8rem_1fr] gap-y-2 text-sm">
              <dt className="text-muted-foreground">ID</dt>
              <dd className="font-mono">{planet.id}</dd>
              <dt className="text-muted-foreground">Name</dt>
              <dd>{planet.name}</dd>
              <dt className="text-muted-foreground">Description</dt>
              <dd>{planet.description ?? '—'}</dd>
            </dl>
          ) : null}
          {planet && (
            <Button variant="outline" size="sm" onClick={() => edit('planets', planet.id)}>
              Edit
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
