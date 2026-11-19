import type {
  FetchfullyErrorResponse,
  FetchfullySuccessResponse,
} from "./types";

/* -------------------------------------------------------------- */

type Parsed<R> = Omit<R, "refetch">;

/**
 * A response as parsed, before the engine gives each caller its own copy
 * with `requestUrl` and `refetch`. Shared between callers by the in-flight
 * registry and stored by the cache.
 */
export type ParsedResponse<T = any> =
  | Parsed<FetchfullySuccessResponse<T>>
  | Parsed<FetchfullyErrorResponse<T>>;

// A settled response is never in flight, so these are fixed (deprecated fields)
const settledFlags = { isIdle: true, isLoading: false } as const;

export function successResponse<T>(
  data: T,
  statusCode?: number,
  headers?: Headers
): Parsed<FetchfullySuccessResponse<T>> {
  return {
    status: "success",
    data,
    error: null,
    isSuccess: true,
    isError: false,
    ...settledFlags,
    statusCode,
    headers,
  };
}

export function errorResponse<T = any>(
  error: Error,
  statusCode?: number,
  headers?: Headers
): Parsed<FetchfullyErrorResponse<T>> {
  return {
    status: "error",
    data: null,
    error,
    isSuccess: false,
    isError: true,
    ...settledFlags,
    statusCode,
    headers,
  };
}
