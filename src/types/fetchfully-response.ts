import { RequestHeaders } from "./config";
/* ----------------------------------------------------- */
export type RequestStatus = "idle" | "loading" | "success" | "error";

export type FetchfullyResponse<T = any> = {
  data: T | null;
  error: Error | null;
  status: RequestStatus;

  // Convenience booleans (similar to React Query)
  isIdle: boolean;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;

  // Headers and status
  statusCode?: number;
  headers?: RequestHeaders;

  // Control methods
  refetch?: () => Promise<FetchfullyResponse<T>>;
  cancel?: () => void;
};