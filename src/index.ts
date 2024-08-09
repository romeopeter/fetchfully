const baseURL = "https://earthpoint.onrender.com/api/v1";
type CustomOptionsType = {
    responseBodyType: "text" | "json" | "formData" | "blob" | "arrayBuffer" | "body",
    timeout: number
}
type FetchAPIPropsType = {
  path: string;
  method?: "GET" | "POST" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS";
  headers?: { [name: string]: string };
  body?: string;
  credentials?: "same-origin" | "omit" | "include";
  keepalive?: boolean;
  mode?: "cors" | "same-origin" | "no-cors";
  customOptions: CustomOptionsType
};

export default async function fetcher({
  path,
  method = "GET",
  body,
  headers,
  credentials = "same-origin",
  keepalive = false,
  mode = "cors",
  customOptions
}: FetchAPIPropsType): Promise<string | any> {
  const res = await fetch(`${baseURL}${path}`, {
    method,
    body,
    headers,
    credentials,
    keepalive,
    mode,
  });

  if (customOptions.responseBodyType === "json") {
    return {
      data: res.json(),
      _fetchObject: res,
    };
  }

  return {
    data: res.text(),
    _fetchObject: res,
  };
}
