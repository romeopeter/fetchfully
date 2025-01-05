// Common request headers type
export type RequestHeaders = {
  common: {
    Authorization?: string;
    "Content-Type"?:
      | "application/json"
      | "application/x-www-form-urlencoded"
      | "multipart/form-data"
      | "text/html"
      | "text/plain";
    "Cache-Control"?: "no-cache" | "no-store" | "must-revalidate";
  };
  [name: string]: any;
};

// Fetchfully core configuration
export type FetchfullyConfig = {
  baseURL?: string;
  url?: string;
  path?: string | string[];
  query?: Record<string, any>;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: any;
  headers?: {
    "Authorization"?: string;
    "Content-Type"?:
      | "application/json"
      | "application/x-www-form-urlencoded"
      | "multipart/form-data"
      | "text/html"
      | "text/plain";
    "Cache-Control"?: "no-cache" | "no-store" | "must-revalidate";
    [name: string]: any;
  };
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
