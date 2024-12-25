import {
  NetworkError,
  HttpError,
  CorsError,
  TimeoutError,
} from "../custom-request-errors";
/* ------------------------------------------------ */

export type CustomOptionsType = {
  timeout?: number;
  queryArrayFormat: "brackets" | "comma" | "repeat" | "none";
};

// Request headers type
export type RequestHeadersType = {
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

export type FetcherType = {
  url: string;
  path?: string | string[];
  query?: Record<string, any>;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS";
  headers?: RequestHeadersType;
  body?: string;
  credentials?: "same-origin" | "omit" | "include";
  keepalive?: boolean;
  mode?: "cors" | "same-origin" | "no-cors";
  customOptions: CustomOptionsType;
};

// Data properties shape return by response to a request
export type ResponseByContentTypeProps = {
  data: any;
  _responseObject: Response;
};

// Fetcher returned data type
export type FetcherReturnType = Promise<
  | ResponseByContentTypeProps
  | {
      error: {
        error: string;
        reason: unknown;
      };
    }
  | undefined
>;

// Request error object shape
export type RequestErrorType =
  | NetworkError
  | HttpError
  | CorsError
  | TimeoutError;
