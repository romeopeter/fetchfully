// Common request headers type
export type RequestHeaders = {
  Authorization?: string;
  "Content-Type"?:
    | "application/json"
    | "application/x-www-form-urlencoded"
    | "multipart/form-data"
    | "text/html"
    | "text/plain";
  "Cache-Control"?: "no-cache" | "no-store" | "must-revalidate";
  [name: string]: any;
};

// Fetchfully core configuration
export type FetchfullyConfig = {
  baseURL?: string;
  url?: string;
  path?: string | string[];
  query?: Record<string, any>;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: string | FormData | Blob | ArrayBuffer | undefined;
  headers?: RequestHeaders;
  credentials?: "same-origin" | "omit" | "include";
  keepalive?: boolean;
  mode?: "same-origin" | "cors" | "no-cors";
  timeout?: number;
  queryArrayFormat?: "brackets" | "comma" | "repeat" | "none";
  retries?: number;
  // retryDelay?: number;
  whenSuccessful?: (data: any) => void;
  whenFailed?: (data: Error) => void;
  whenDone?: (data: any, Error: null | Error) => void;
};

// Request type
export type RequestStatus = "idle" | "loading" | "success" | "error";

// Response type
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

export interface RequestMethods {
  get<T = any>(
    path: string,
    query?: Record<string, any>
  ): Promise<FetchfullyResponse<T>>;
  post<T = any>(
    path: string,
    data?: any,
    query?: Record<string, any>
  ): Promise<FetchfullyResponse<T>>;
  put<T = any>(
    path: string,
    data?: any,
    query?: Record<string, any>
  ): Promise<FetchfullyResponse<T>>;
  patch<T = any>(
    path: string,
    data?: any,
    query?: Record<string, any>
  ): Promise<FetchfullyResponse<T>>;
  delete<T = any>(
    path: string,
    query?: Record<string, any>
  ): Promise<FetchfullyResponse<T>>;
}

// Fetchfully instance structure
export interface FetchfullyInstance extends RequestMethods {
  (config: FetchfullyConfig): Promise<any>;
  defaults: FetchfullyConfig;
  create: (config?: FetchfullyConfig) => FetchfullyInstance;
}
