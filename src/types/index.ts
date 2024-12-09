export type CustomOptionsType = {
  responseBodyType:
    | "text"
    | "json"
    | "formData"
    | "blob"
    | "arrayBuffer"
    | "body";
  timeout?: number;
  queryParamsArrayFormatter?: "brackets" | "comma" | "repeat" | "none";
};

export type FetchAPIPropsType = {
  baseUrl: string;
  path: string | string[];
  queryParams: Record<string, any>;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS";
  headers?: Record<string, any>;
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

// Fetcher type
export type FetcherPropsType = Promise<
  | ResponseByContentTypeProps
  | {
      error: {
        error: string;
        reason: unknown;
      };
    }
  | undefined
>;
