// Common request headers type
export type CommonRequestHeaders = {
  authorization?: string;
  contentType?:
    | "application/json"
    | "application/x-www-form-urlencoded"
    | "multipart/form-data"
    | "text/html"
    | "text/plain";
  cacheControl?: "no-cache" | "no-store" | "must-revalidate";
  [name: string]: any;
};

// Fetchfully core configuration
export type FetchfullyConfig = {
  baseURL?: string;
  url?: string;
  path?: string | string[];
  query?: Record<string, any>;
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  body?: any;
  headers?: CommonRequestHeaders;
  credentials?: "same-origin" | "omit" | "include";
  keepalive?: boolean;
  mode?: "same-origin" | "cors" | "no-cors";
  timeout?: number;
  queryArrayFormat?: "brackets" | "comma" | "repeat" | "none";
};

// Fetchfully instance structure
export type FetchfullyInstance = {
  (config: FetchfullyConfig): Promise<any>;
  defaults: FetchfullyConfig;
  createFetcher: (config?: FetchfullyConfig) => FetchfullyInstance;
};
