import { RequestStatus } from "./types/fetchfully-response";
import { FetchfullyResponse } from "./types/fetchfully-response";

/* -------------------------------------------------------------- */

// Response object
export default function fetchfullyResponse<T>(
  status: RequestStatus,
  data: T | null = null,
  error: Error | null = null,
  statusCode?: number,
  headers?: Headers,
  refetch?: () => Promise<FetchfullyResponse<T>>
): FetchfullyResponse<T> {
  const convenientStatusCheck = {
    isIdle: status !== "loading", // Request is idle if no loading operation
    isLoading: status === "loading",
    isError: status === "error",
    isSuccess: status === "success",
  };

  return {
    data,
    error,
    status,
    ...convenientStatusCheck,
    statusCode,
    headers,
    refetch,
  };
}
