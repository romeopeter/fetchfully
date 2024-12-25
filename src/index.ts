import { FetcherType, FetcherReturnType } from "./types";
import requestQuery from "./requestQuery";
import mutationQuery from "./mutationQuery";
import { constructUrl } from "./url-parameters";
import { formattedRequestHeaders } from "./request-headers-formatter";
import {
  HttpError,
  TimeoutError,
  CorsError,
  NetworkError,
} from "./custom-request-errors";

/* ---------------------------------------------------------------------------------- */

/**
 * Object-first network request API.
 * 
 * @param url String: base URL for all requests
 * @param path String | String[] : optional path segment(s)
 * @param queryParams Record<string, any> : Query parameters
 * @param method String : Request method
 * @param body string | undefined : Request payload (optional)
 * @param headers Record<string, any> | undefined : HTTP request headers
 * @param credentials "same-origin" | "omit" | "include" : Request credentials
 * @param keepalive boolean : Keep request open even webpage is closed
 * @param mode "same-origin" | "cors" | "no-cors" -- header
 * @param customOptions CustomOptionsType : Custom options
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
    timeout: 5000,
    queryArrayFormat: "comma",
  },
}: FetcherType): FetcherReturnType {
  const abortRequest = new AbortController(); // Controller object to abort request
  let timeoutID; // used as ID to cancel timeout object created by setTimeout().

  const queryOptions = {
    query: query,
    queryArrayFormat: customOptions.queryArrayFormat,
  };
  const fullUrl = constructUrl(url, path, queryOptions);

  const fetcherOptions: RequestInit = {
    method,
    body,
    headers: formattedRequestHeaders(headers),
    credentials,
    keepalive,
    mode,
    signal: abortRequest.signal,
  };

  // Parse payload for request other than GET
  if (method !== "GET" && body) fetcherOptions.body = JSON.stringify(body);

  try {
    if (customOptions.timeout) {
      timeoutID = setTimeout(() => abortRequest.abort(), customOptions.timeout);
    }
    const response = await fetch(fullUrl, fetcherOptions);

    // Requests other than a GET
    if (method !== "GET") return mutationQuery(response);

    // GET requests
    return requestQuery(response);
  } catch (error: any) {
    if (error instanceof TypeError) {
      if (
        error.message.includes("CORS") ||
        error.message.includes("cross-origin")
      ) {
        throw new CorsError("CORS error occurred");
      }
      throw new NetworkError("Network error occurred");
    } else if (error.name === "AbortError") {
      throw new TimeoutError("Request timed out");
    } else if (error instanceof HttpError) {
      throw error;
    } else {
      throw error;
    }
  } finally {
    if (timeoutID) clearTimeout(timeoutID);
  }
}
