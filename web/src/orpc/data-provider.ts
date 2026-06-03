import type {
  BaseKey,
  CrudFilters,
  DataProvider,
  HttpError,
  Pagination,
} from "@refinedev/core";
import { ORPCError } from "@orpc/client";
import { orpc } from "./client";

const RPC_BASE = process.env.NEXT_PUBLIC_ORPC_URL ?? 'http://localhost:3000/rpc'

/**
 * Custom Refine v5 DataProvider backed by the typed oRPC client.
 *
 * Refine speaks a normalized CRUD vocabulary (getList/getOne/create/update/
 * deleteOne) keyed by a `resource` string. oRPC speaks typed, versioned,
 * nested procedures (`orpc.v1.planet.list`, …). This adapter is the seam: it
 * maps one onto the other while preserving oRPC's compile-time types inside
 * each resource handler.
 *
 * Two resources are wired, which is the whole point of the backend's versioning
 * story — they are independent contracts behind one provider:
 *   - "planets"     -> v1 (full CRUD)
 *   - "planets-v2"  -> v2 (list/show/create; richer shape + climate filter)
 */

// Refine BaseKey is string | number; the contract wants a positive integer.
const toId = (id: BaseKey) => Number(id);

// Refine pagination (1-based currentPage/pageSize) -> oRPC offset (cursor/limit).
function toCursor(pagination?: Pagination) {
  const currentPage = pagination?.currentPage ?? 1;
  const pageSize = pagination?.pageSize ?? 10;
  return { cursor: (currentPage - 1) * pageSize, limit: pageSize };
}

// Pull a single `climate` equality filter out of Refine's generic filter array
// (the only filter the v2 contract supports). Other filters/sorters are ignored
// because the contract doesn't model them — see the README note.
type Climate = NonNullable<
  Parameters<typeof orpc.v2.planet.list>[0]
>["climate"];
function climateFilter(filters?: CrudFilters): Climate | undefined {
  const f = filters?.find(
    (x): x is Extract<typeof x, { field: string }> =>
      "field" in x && x.field === "climate",
  );
  return (f?.value as Climate) || undefined;
}

// oRPC throws typed ORPCError; Refine wants HttpError ({ message, statusCode }).
function toHttpError(e: unknown): HttpError {
  if (e instanceof ORPCError) {
    return {
      message: e.message,
      statusCode: e.status,
      errors: e.data as never,
    };
  }
  const message = e instanceof Error ? e.message : "Unexpected error";
  return { message, statusCode: 500 };
}

// Run an oRPC call and normalize any failure into a Refine HttpError.
async function call<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    throw toHttpError(e);
  }
}

/**
 * Per-resource handlers. Each one stays fully typed against its oRPC procedure;
 * `variables` arrive untyped from Refine forms, so we assert them to the
 * procedure's input type at this single, explicit boundary.
 */
const RESOURCES = {
  planets: {
    list: (pagination?: Pagination, _filters?: CrudFilters) =>
      orpc.v1.planet.list(toCursor(pagination)),
    one: (id: BaseKey) => orpc.v1.planet.find({ id: toId(id) }),
    create: (vars: unknown) =>
      orpc.v1.planet.create(
        vars as Parameters<typeof orpc.v1.planet.create>[0],
      ),
    update: (id: BaseKey, vars: unknown) =>
      orpc.v1.planet.update({
        id: toId(id),
        ...(vars as Omit<Parameters<typeof orpc.v1.planet.update>[0], "id">),
      }),
    remove: (id: BaseKey) => orpc.v1.planet.delete({ id: toId(id) }),
  },
  "planets-v2": {
    list: (pagination?: Pagination, filters?: CrudFilters) =>
      orpc.v2.planet.list({
        ...toCursor(pagination),
        climate: climateFilter(filters),
      }),
    one: (id: BaseKey) => orpc.v2.planet.find({ id: toId(id) }),
    create: (vars: unknown) =>
      orpc.v2.planet.create(
        vars as Parameters<typeof orpc.v2.planet.create>[0],
      ),
    update: undefined,
    remove: undefined,
  },
} as const;

type ResourceName = keyof typeof RESOURCES;

function resolve(resource: string) {
  const r = RESOURCES[resource as ResourceName];
  if (!r) throw toHttpError(new Error(`Unknown resource: ${resource}`));
  return r;
}

function unsupported(resource: string, action: string): never {
  throw {
    message: `"${action}" is not supported for resource "${resource}"`,
    statusCode: 405,
  } satisfies HttpError;
}

export const orpcDataProvider: DataProvider = {
  getApiUrl: () => RPC_BASE,

  getList: async (params) => {
    console.log("🚀 ~ params:", params);
    const { resource, pagination, filters } = params;
    const { items, total } = await call<{ items: unknown[]; total: number }>(
      () => resolve(resource).list(pagination, filters),
    );
    return { data: items as never, total };
  },

  getOne: async ({ resource, id }) => {
    const data = await call<unknown>(() => resolve(resource).one(id));
    return { data: data as never };
  },

  create: async ({ resource, variables }) => {
    const r = resolve(resource);
    const data = await call<unknown>(() => r.create(variables));
    return { data: data as never };
  },

  update: async ({ resource, id, variables }) => {
    const r = resolve(resource);
    if (!r.update) return unsupported(resource, "update");
    const data = await call<unknown>(() => r.update!(id, variables));
    return { data: data as never };
  },

  deleteOne: async ({ resource, id }) => {
    const r = resolve(resource);
    if (!r.remove) return unsupported(resource, "delete");
    await call<unknown>(() => r.remove!(id));
    // delete returns void in the contract; echo the id back for Refine.
    return { data: { id } as never };
  },
};
