import { FetchAPIPropsType } from "./types";
import requestQuery from "./requestQuery";
import mutationQuery from "./mutationQuery";

/* ------------------------------------------------------------------------------------ */

/**
 * Object-first network request API
 *
 * @param URL String
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
  URL,
  method = "GET",
  body,
  headers,
  credentials = "same-origin",
  keepalive = false,
  mode = "cors",
  customOptions,
}: FetchAPIPropsType): Promise<string | any> {
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
    const response = await fetch(`${URL}`, fetcherOptions);

    // Requests other than a GET
    if (method !== "GET") mutationQuery(response);

    // Non-GET requests
    requestQuery(response);
  } catch (error) {
    console.log(error);

    return {
      error: "HTTP ERROR",
      reason: error,
    };
  }
}
