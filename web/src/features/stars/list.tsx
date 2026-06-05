"use client";

import { useTable, type HttpError } from "@refinedev/core";
import type { Star } from "@server/schemas";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toListInput } from "@/orpc/data-provider";

const STAR_TYPES = ["O", "B", "A", "F", "G", "K", "M"] as const;
const CONSTELLATIONS = [
  "Auriga",
  "Boötes",
  "Canis Major",
  "Canis Minor",
  "Carina",
  "Centaurus",
  "Cetus",
  "Cygnus",
  "Eridanus",
  "Gemini",
  "Leo",
  "Lyra",
  "Ophiuchus",
  "Orion",
  "Piscis Austrinus",
  "Scorpius",
  "Taurus",
  "Ursa Minor",
  "Virgo",
  "N/A",
] as const;

const SORT_FIELDS = [
  { value: "name", label: "Name" },
  { value: "temperature", label: "Temperature" },
  { value: "distanceLy", label: "Distance" },
] as const;

// Spectral type → approximate color for visual hint
const TYPE_COLORS: Record<string, string> = {
  O: "bg-blue-200 text-blue-800",
  B: "bg-blue-100 text-blue-700",
  A: "bg-white text-gray-700 border",
  F: "bg-yellow-50 text-yellow-700",
  G: "bg-yellow-100 text-yellow-800",
  K: "bg-orange-100 text-orange-800",
  M: "bg-red-100 text-red-800",
};

function getFilterValue(
  filters: ReturnType<typeof useTable>["filters"],
  field: string,
  op: string,
) {
  return filters?.find(
    (f) => "field" in f && f.field === field && f.operator === op,
  )?.value;
}

export function StarList() {
  const {
    tableQuery,
    filters,
    setFilters,
    sorters,
    setSorters,
    currentPage,
    setCurrentPage,
    pageSize,
    pageCount,
  } = useTable<Star, HttpError>({
    resource: "stars",
    pagination: { currentPage: 1, pageSize: 10, mode: "server" },
    sorters: { initial: [{ field: "name", order: "asc" }] },
  });

  const rows = tableQuery.data?.data ?? [];
  const total = tableQuery.data?.total ?? 0;

  // Read current filter values from Refine state
  const nameVal = (getFilterValue(filters, "name", "contains") as string) ?? "";
  const typeVal = (getFilterValue(filters, "type", "eq") as string) ?? "all";
  const constellationVal =
    (getFilterValue(filters, "constellation", "eq") as string) ?? "all";
  const isVisibleVal = getFilterValue(filters, "isVisible", "eq");
  const tempGteVal =
    (getFilterValue(filters, "temperature", "gte") as number | undefined) ?? "";
  const tempLteVal =
    (getFilterValue(filters, "temperature", "lte") as number | undefined) ?? "";
  const distGteVal =
    (getFilterValue(filters, "distanceLy", "gte") as number | undefined) ?? "";
  const distLteVal =
    (getFilterValue(filters, "distanceLy", "lte") as number | undefined) ?? "";
  const sortField = sorters?.[0]?.field ?? "name";
  const sortOrder = sorters?.[0]?.order ?? "asc";

  // Compute what the data provider actually sends to oRPC — same function the
  // generic data provider uses, so this is authoritative, not an approximation.
  const orpcParams = toListInput(
    { currentPage, pageSize, mode: "server" },
    filters,
    sorters,
  );

  function setFilter(field: string, op: string, value: unknown) {
    // Remove existing filter for same field+op, then add new one
    const next = filters.filter(
      (f) => !("field" in f && f.field === field && f.operator === op),
    );
    if (value !== undefined && value !== "" && value !== "all") {
      setFilters(
        [...next, { field, operator: op as "contains", value }],
        "replace",
      );
    } else {
      setFilters(next, "replace");
    }
  }

  function clearAll() {
    setFilters([], "replace");
    setSorters([{ field: "name", order: "asc" }]);
  }

  const hasFilters = filters.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Stars (v3)</h1>
        <p className="text-sm text-muted-foreground">
          Deep filter integration test · text search · enum · boolean · numeric
          ranges · sorting
        </p>
      </div>

      {/* Filter controls */}
      <Card className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Filters</span>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearAll}>
              Clear all
            </Button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {/* Text search — operator: contains */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">
              Name (contains)
            </Label>
            <Input
              placeholder="Search name…"
              value={nameVal}
              onChange={(e) => setFilter("name", "contains", e.target.value)}
            />
          </div>

          {/* Spectral type — operator: eq */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Type (eq)</Label>
            <Select
              value={typeVal}
              onValueChange={(v) => setFilter("type", "eq", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {STAR_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t} — {typeLabel(t)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Constellation — operator: eq */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">
              Constellation (eq)
            </Label>
            <Select
              value={constellationVal}
              onValueChange={(v) => setFilter("constellation", "eq", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All constellations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All constellations</SelectItem>
                {CONSTELLATIONS.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Naked-eye visible — operator: eq (boolean) */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">
              Visible to naked eye (eq)
            </Label>
            <Select
              value={isVisibleVal === undefined ? "all" : String(isVisibleVal)}
              onValueChange={(v) =>
                setFilter(
                  "isVisible",
                  "eq",
                  v === "all" ? undefined : v === "true",
                )
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="true">Visible</SelectItem>
                <SelectItem value="false">Not visible</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Temperature range — operators: gte / lte */}
          <div className="space-y-1 col-span-2 md:col-span-1">
            <Label className="text-xs text-muted-foreground">
              Temperature K (gte / lte)
            </Label>
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="Min"
                value={tempGteVal}
                onChange={(e) =>
                  setFilter(
                    "temperature",
                    "gte",
                    e.target.value ? Number(e.target.value) : undefined,
                  )
                }
              />
              <Input
                type="number"
                placeholder="Max"
                value={tempLteVal}
                onChange={(e) =>
                  setFilter(
                    "temperature",
                    "lte",
                    e.target.value ? Number(e.target.value) : undefined,
                  )
                }
              />
            </div>
          </div>

          {/* Distance range — operators: gte / lte */}
          <div className="space-y-1 col-span-2 md:col-span-1">
            <Label className="text-xs text-muted-foreground">
              Distance ly (gte / lte)
            </Label>
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="Min"
                value={distGteVal}
                onChange={(e) =>
                  setFilter(
                    "distanceLy",
                    "gte",
                    e.target.value ? Number(e.target.value) : undefined,
                  )
                }
              />
              <Input
                type="number"
                placeholder="Max"
                value={distLteVal}
                onChange={(e) =>
                  setFilter(
                    "distanceLy",
                    "lte",
                    e.target.value ? Number(e.target.value) : undefined,
                  )
                }
              />
            </div>
          </div>

          {/* Sorting */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Sort by</Label>
            <div className="flex gap-2">
              <Select
                value={sortField}
                onValueChange={(v) =>
                  setSorters([{ field: v ?? sortField, order: sortOrder as "asc" | "desc" }])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SORT_FIELDS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 px-3"
                onClick={() =>
                  setSorters([
                    {
                      field: sortField,
                      order: sortOrder === "asc" ? "desc" : "asc",
                    },
                  ])
                }
              >
                {sortOrder === "asc" ? "↑" : "↓"}
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Results table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="w-12">Type</TableHead>
              <TableHead className="w-32">Temp (K)</TableHead>
              <TableHead className="w-36">Distance (ly)</TableHead>
              <TableHead>Constellation</TableHead>
              <TableHead className="w-24">Visible</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tableQuery.isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={7}>
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="h-24 text-center text-muted-foreground"
                >
                  No stars match the current filters.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-mono text-xs">{s.id}</TableCell>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-mono font-semibold ${TYPE_COLORS[s.type] ?? ""}`}
                    >
                      {s.type}
                    </span>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {s.temperature.toLocaleString()}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {s.distanceLy < 0.01
                      ? s.distanceLy.toExponential(2)
                      : s.distanceLy.toFixed(2)}
                  </TableCell>
                  <TableCell>{s.constellation}</TableCell>
                  <TableCell>
                    <Badge variant={s.isVisible ? "default" : "secondary"}>
                      {s.isVisible ? "Yes" : "No"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pageCount > 1 && (
        <div className="flex items-center gap-2 text-sm">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage(currentPage - 1)}
          >
            Prev
          </Button>
          <span className="text-muted-foreground">
            Page {currentPage} / {pageCount} · {total} results
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage >= pageCount}
            onClick={() => setCurrentPage(currentPage + 1)}
          >
            Next
          </Button>
        </div>
      )}

      {/* Debug panel — shows exactly what oRPC receives */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">oRPC Request Debug</span>
          <Badge variant="outline" className="font-mono text-xs">
            GET /api/v3/stars
          </Badge>
          <span className="text-xs text-muted-foreground ml-auto">
            {total} result{total !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <p className="text-xs text-muted-foreground mb-1">
              Refine filters state
            </p>
            <pre className="rounded bg-muted px-3 py-2 text-xs overflow-auto max-h-48">
              {JSON.stringify(filters, null, 2)}
            </pre>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">
              Mapped oRPC input (sent to server)
            </p>
            <pre className="rounded bg-muted px-3 py-2 text-xs overflow-auto max-h-48">
              {JSON.stringify(orpcParams, null, 2)}
            </pre>
          </div>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">
            Refine sorters state
          </p>
          <pre className="rounded bg-muted px-3 py-2 text-xs overflow-auto">
            {JSON.stringify(sorters, null, 2)}
          </pre>
        </div>
      </Card>
    </div>
  );
}

function typeLabel(type: string): string {
  const labels: Record<string, string> = {
    O: "Blue supergiant",
    B: "Blue-white",
    A: "White",
    F: "Yellow-white",
    G: "Yellow (Sun-like)",
    K: "Orange",
    M: "Red dwarf",
  };
  return labels[type] ?? type;
}
