'use client'

import { useTable, useNavigation, useDelete, type HttpError } from '@refinedev/core'
import type { PlanetV1 } from '@server/schemas'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'

const RESOURCE = 'planets'

export function PlanetList() {
  const {
    tableQuery,
    currentPage,
    setCurrentPage,
    pageCount,
  } = useTable<PlanetV1, HttpError>({
    resource: RESOURCE,
    pagination: { currentPage: 1, pageSize: 5, mode: 'server' },
  })
  const { create, edit, show } = useNavigation()
  const { mutate: deleteOne } = useDelete()

  const rows = tableQuery.data?.data ?? []
  const total = tableQuery.data?.total ?? 0

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Planets</h1>
          <p className="text-sm text-muted-foreground">{total} total · oRPC v1 over RPC</p>
        </div>
        <Button onClick={() => create(RESOURCE)}>New planet</Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-48 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tableQuery.isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={4}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              : rows.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono">{p.id}</TableCell>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {p.description ?? '—'}
                    </TableCell>
                    <TableCell className="space-x-2 text-right">
                      <Button variant="outline" size="sm" onClick={() => show(RESOURCE, p.id)}>
                        View
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => edit(RESOURCE, p.id)}>
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() =>
                          deleteOne({ resource: RESOURCE, id: p.id, mutationMode: 'optimistic' })
                        }
                      >
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
            {!tableQuery.isLoading && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                  No planets yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-end gap-2">
        <span className="text-sm text-muted-foreground">
          Page {currentPage} of {Math.max(pageCount ?? 1, 1)}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage <= 1}
          onClick={() => setCurrentPage(currentPage - 1)}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage >= (pageCount ?? 1)}
          onClick={() => setCurrentPage(currentPage + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  )
}
