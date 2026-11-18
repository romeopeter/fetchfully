import type {
  FetchfullyConfig,
  FetchfullyErrorResponse,
  FetchfullyResponse,
  FetchfullySuccessResponse,
} from "./types";

/* -------------------------------------------------------------- */

type Refetch<T> = (
  override?: Partial<FetchfullyConfig>
) => Promise<FetchfullyResponse<T>>;

// A settled response is never in flight, so these are fixed (deprecated fields)
const settledFlags = { isIdle: true, isLoading: false } as const;

export function successResponse<T>(
  data: T,
  statusCode?: number,
  headers?: Headers,
  refetch?: Refetch<T>
): FetchfullySuccessResponse<T> {
  return {
    status: "success",
    data,
    error: null,
    isSuccess: true,
    isError: false,
    ...settledFlags,
    statusCode,
    headers,
    refetch,
  };
}

export function errorResponse<T = any>(
  error: Error,
  statusCode?: number,
  headers?: Headers,
  refetch?: Refetch<T>
): FetchfullyErrorResponse<T> {
  return {
    status: "error",
    data: null,
    error,
    isSuccess: false,
    isError: true,
    ...settledFlags,
    statusCode,
    headers,
    refetch,
  };
}
