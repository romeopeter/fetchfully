import { FetchAPIPropsType, FetcherReturnType } from "./types";
import requestQuery from "./requestQuery";
import mutationQuery from "./mutationQuery";
import { constructUrl } from "./url-parameters";

/* ------------------------------------------------------------------------------------ */

/**
 * Object-first network request API.
 *
 * @param baseUrl String -- base URL for all requests
 * @param path String | String[] -- optional path segment(s)
 * @param queryParams Record<string, any> -- Query parameters
 * @param method String -- Request method
 * @param body string | undefined -- Request payload (optional)
 * @param headers Record<string, any> | undefined -- HTTP request headers
 * @param credentials "same-origin" | "omit" | "include" -- Request credentials
 * @param keepalive boolean -- Keep request open even webpage is closed
 * @param mode "same-origin" | "cors" | "no-cors" -- header
 * @param customOptions: CustomOptionsType -- Custom options
 *
 * @returns Promise<any | string>
 */
export default async function fetcher({
  url,
  path,
  query,
  method = "GET",
  body,
  headers,
  credentials = "same-origin",
  keepalive = false,
  mode = "cors",
  customOptions = {
    responseBodyType: "json",
    timeout: 5000,
    queryArrayFormat: "comma",
  },
}: FetchAPIPropsType): FetcherReturnType {
  const queryOptions = {
    query: query,
    queryArrayFormat: customOptions.queryArrayFormat
  }
  const fullUrl = constructUrl(url, path, queryOptions);

  // Abortion object for ongoing request
  const abortRequest = new AbortController();

  if (customOptions.timeout) {
    const timeoutID = setTimeout(
      () => abortRequest.abort(),
      customOptions.timeout
    );

    clearTimeout(timeoutID);
  }

  const fetcherOptions: RequestInit = {
    method,
    body,
    headers,
    credentials,
    keepalive,
    mode,
    signal: abortRequest.signal,
  };

  // Parse payload for request other than GET
  if (method !== "GET" && body) fetcherOptions.body = JSON.stringify(body);

  try {
    const response = await fetch(fullUrl, fetcherOptions);

    // Requests other than a GET
    if (method !== "GET") return mutationQuery(response);

    // Non-GET requests
    return requestQuery(response);
  } catch (error) {
    return {
      error: {
        error: "HTTP ERROR",
        reason: error,
      },
    };
  }
}
