'use client'

import { useTable, type HttpError } from '@refinedev/core'
import type { PlanetV2 } from '@server/schemas'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'

const CLIMATES = ['temperate', 'arid', 'frozen', 'gas', 'unknown'] as const

export function PlanetV2List() {
  const { tableQuery, filters, setFilters } = useTable<PlanetV2, HttpError>({
    resource: 'planets-v2',
    pagination: { currentPage: 1, pageSize: 20, mode: 'server' },
  })

  const climate =
    (filters.find((f) => 'field' in f && f.field === 'climate')?.value as string) ?? 'all'

  const rows = tableQuery.data?.data ?? []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Planets (v2)</h1>
          <p className="text-sm text-muted-foreground">
            Independent v2 contract · structured climate + discovery year
          </p>
        </div>
        <Select
          value={climate}
          onValueChange={(value) =>
            setFilters(
              value === 'all'
                ? []
                : [{ field: 'climate', operator: 'eq', value }],
              'replace',
            )
          }
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Filter climate" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All climates</SelectItem>
            {CLIMATES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Climate</TableHead>
              <TableHead className="w-40">Discovered</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tableQuery.isLoading ? (
              <TableRow>
                <TableCell colSpan={4}>
                  <Skeleton className="h-5 w-full" />
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                  No planets match this climate.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono">{p.id}</TableCell>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{p.climate}</Badge>
                  </TableCell>
                  <TableCell>{p.discoveredYear || '—'}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
