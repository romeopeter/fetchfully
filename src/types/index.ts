export type CustomOptionsType = {
  responseBodyType:
    | "text"
    | "json"
    | "formData"
    | "blob"
    | "arrayBuffer"
    | "body";
  timeout?: number;
  params?: {[name: string]: any}
};

export type FetchAPIPropsType = {
  URL: string;
  method?: "GET" | "POST" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS";
  headers?: { [name: string]: string };
  body?: string;
  credentials?: "same-origin" | "omit" | "include";
  keepalive?: boolean;
  mode?: "cors" | "same-origin" | "no-cors";
  customOptions: CustomOptionsType;
};
