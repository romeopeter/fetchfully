import requestQuery from "./request-query";
import mutationQuery from "./mutation-query";
import { constructUrl } from "./utils/url-parameters";
import { mergeConfig } from "./utils/mergeConfig";
import {
  NetworkError,
  CorsError,
  TimeoutError,
  HttpError,
} from "./utils/custom-request-errors";
import fetchfullyResponse from "./response";
import { attachActionMethods } from "./consumable-methods";
import {
  createInterrupts,
  runRequestInterrupts,
  runResponseInterrupts,
} from "./interrupts";
import {
  type FetchfullyConfig,
  type FetchfullyResponse,
  type FetchfullyInstance,
} from "./types";

/* ------------------------------------------------------------------------------------ */

/**
 * Creates an instance of the core fetcher function
 *
 * @param defaultConfig FetchfullyConfig
 *
 */
export function createFetch(
  factoryConfig: FetchfullyConfig = {}
): Omit<FetchfullyInstance, "create"> {
  const interrupts = createInterrupts();

  async function fetcher(
    initConfig: FetchfullyConfig
  ): Promise<FetchfullyResponse> {
    const merged = mergeConfig(factoryConfig, initConfig);
    const config = await runRequestInterrupts(merged, interrupts.request);

    // AbortController for request cancellation and timeout handling
    const abortRequest = new AbortController();
    let timeoutID: ReturnType<typeof setTimeout> | undefined;

    const refetch = (override?: Partial<FetchfullyConfig>) => {
      return  fetcher({ ...initConfig, ...override });
    }

    // The final result of the fetch operation.
    let result: FetchfullyResponse;

    const requestQueryParameter = {
      query: config.query,
      queryArrayFormat: config.queryArrayFormat,
    };

    const fetchConfig: RequestInit = {
      method: config.method,
      body: undefined,
      headers: config.headers,
      credentials: config.credentials,
      keepalive: config.keepalive,
      mode: config.mode,
      signal: abortRequest.signal,
    };

    if (config.body && config.method !== "GET") {
      if (config.body instanceof FormData) {
        fetchConfig.body = config.body;
      } else if (typeof config.body === "string") {
        fetchConfig.body = config.body;
      } else {
        fetchConfig.body = JSON.stringify(config.body);
      }
    }

    if (config.baseURL && config.url) {
      throw new Error(
        "Fetchfully: cannot set both 'baseURL' and 'url'. Use 'baseURL' with 'path' for path segments, or 'url' for a full URL."
      );
    }

    try {
      if (config.timeout) {
        timeoutID = setTimeout(() => abortRequest.abort(), config.timeout);
      }

      const baseUrl = config.baseURL
        ? config.baseURL.replace(/\/+$/, "")
        : config.url ?? "";

      const fullUrl = constructUrl(baseUrl, config.path, requestQueryParameter);

      const originResponse = await fetch(fullUrl, fetchConfig);

      result =
        config.method !== "GET"
          ? await mutationQuery(originResponse, refetch)
          : await requestQuery(originResponse, refetch);
    } catch (error: any) {
      let fetchError: Error;

      if (error instanceof TypeError) {
        if (
          error.message.includes("CORS") ||
          error.message.includes("cross-origin")
        ) {
          fetchError = new CorsError("CORS error occurred");
        } else if (error.message.includes("fetch failed")) {
          fetchError = new NetworkError("Network error occurred");
        } else {
          fetchError = error;
        }
      } else if (error.name === "AbortError") {
        fetchError = new TimeoutError("Request timed out");
      } else if (error instanceof HttpError) {
        fetchError = error;
      } else {
        fetchError = error;
      }

      result = fetchfullyResponse("error", null, fetchError, undefined, undefined, refetch);
    } finally {
      clearTimeout(timeoutID);
    }

    return runResponseInterrupts(result!, interrupts.response);
  }

  fetcher.defaults = factoryConfig;
  fetcher.interrupts = interrupts;

  return attachActionMethods(fetcher as FetchfullyInstance);
}
