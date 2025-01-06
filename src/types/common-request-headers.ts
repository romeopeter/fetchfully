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