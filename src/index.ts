import { FetchAPIPropsType, FetcherPropsType } from "./types";
import requestQuery from "./requestQuery";
import mutationQuery from "./mutationQuery";
import { constructUrl } from "./url-parameters";

/* ------------------------------------------------------------------------------------ */

/**
 * Object-first network request API
 *
 * @param url url String -- base URL
 * @param path path String | String[] -- optional path parameter(s)
 * @param method String
 * @param body string | undefined
 * @param headers {[name: string]: any} | undefined
 * @param credentials "same-origin" | "omit" | "include"
 * @param keepalive boolean
 * @param mode "same-origin" | "cors" | "no-cors"
 * @param customOptions: CustomOptionsType
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
  customOptions = { responseBodyType: "json", timeout: 5000 },
}: FetchAPIPropsType): FetcherPropsType {
  const fullUrl = constructUrl(url, path, query);

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
