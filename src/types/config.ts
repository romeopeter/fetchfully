import { RequestMethods } from "./consumable-methods";

/* ---------------------------------------------------- */

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
  body?: any;
  headers?: RequestHeaders; 
  credentials?: "same-origin" | "omit" | "include";
  keepalive?: boolean;
  mode?: "same-origin" | "cors" | "no-cors";
  timeout?: number;
  queryArrayFormat?: "brackets" | "comma" | "repeat" | "none";
  retries?: number;
  retryDelay?: number;
  whenSuccessful?: (data: any) => void;
  whenFailed?: (data: Error) => void;
  whenDone?: (data: any, Error: null | Error) => void;
};

// Fetchfully instance structure
export interface FetchfullyInstance extends RequestMethods {
  (config: FetchfullyConfig): Promise<any>;
  defaults: FetchfullyConfig;
  create: (config?: FetchfullyConfig) => FetchfullyInstance;
}
