// Fetchfully core configuration
export type FetchfullyConfig = {
  baseUrl?: string;
  url?: string;
  path?: string | string[];
  query?: Record<string, any>;
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  body?: any;
  headers?: { [name: string]: any };
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
  create: (config?: FetchfullyConfig) => FetchfullyInstance;
};