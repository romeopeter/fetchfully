import { FetchAPIPropsType } from "./types";
import GETRequest from "./GET";

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

  try {
    const response = await fetch(`${URL}`, {
      method,
      body,
      headers,
      credentials,
      keepalive,
      mode,
      signal: abortRequest.signal,
    });

    if (method !== "GET") {
      /**
       * Request other than a GET
       *
       * ...
       */
    }

    // GET Requests
    GETRequest(response);
  } catch (error) {
    console.log(error);

    return {
      error: "HTTP error",
      reason: error
    }
  }
}
