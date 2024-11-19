export type CustomOptionsType = {
  responseBodyType:
    | "text"
    | "json"
    | "formData"
    | "blob"
    | "arrayBuffer"
    | "body";
  timeout?: number;
  params?: { [name: string]: any };
};

export type FetchAPIPropsType = {
  url: string;
  path: string | string[];
  query: Record<string, any>,
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS";
  headers?: { [name: string]: string };
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
