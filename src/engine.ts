import requestQuery from "./request-query";
import mutationQuery from "./mutation-query";
import { constructUrl } from "./utils/url-parameters";
import { mergeConfig } from "./utils/mergeConfig";
import {
  NetworkError,
  CorsError,
  TimeoutError,
  CancelError,
  HttpError,
} from "./utils/custom-request-errors";
import fetchfullyResponse from "./response";
import { attachActionMethods } from "./consumable-methods";
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
  async function fetcher(
    initConfig: FetchfullyConfig
  ): Promise<FetchfullyResponse> {
    const config = mergeConfig(factoryConfig, initConfig);
    const internalController = new AbortController();
    let timeoutID; // ID to terminate timeout object created by setTimeout().

    // Forward cancellation from the caller's signal to our internal controller
    if (config.signal) {
      config.signal.addEventListener("abort", () =>
        internalController.abort(config.signal?.reason)
      );
    }

    // Re-execute request with the same config
    const refetch = (override?: Partial<FetchfullyConfig>) =>
      fetcher({ ...initConfig, ...override });

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
      signal: internalController.signal,
    };

    if (config.body && config.method !== "GET") {
      if (config.body instanceof FormData) {
        fetchConfig.body = config.body;

        // fetchConfig.headers[""]
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
        timeoutID = setTimeout(() => internalController.abort(), config.timeout);
      }

      const baseUrl = config.baseURL
        ? config.baseURL.replace(/\/+$/, "")
        : config.url ?? "";

      const fullUrl = constructUrl(baseUrl, config.path, requestQueryParameter);

      const originResponse = await fetch(fullUrl, fetchConfig);

      // Mutation request
      if (config.method !== "GET") {
        return mutationQuery(originResponse, refetch);
      }

      // // Normal request
      return requestQuery(originResponse, refetch);
    } catch (error: any) {
      if (error instanceof TypeError) {
        if (
          error.message.includes("CORS") ||
          error.message.includes("cross-origin")
        ) {
          const corsError = new CorsError("CORS error occurred");

          return fetchfullyResponse(
            "error",
            null,
            corsError,
            undefined,
            undefined,
            refetch
          );
        }

        if (error.message.includes("fetch failed")) {
          const networkError = new NetworkError("Network error occurred");
          return fetchfullyResponse(
            "error",
            null,
            networkError,
            undefined,
            undefined,
            refetch
          );
        }

        return fetchfullyResponse(
          "error",
          null,
          error,
          undefined,
          undefined,
          refetch
        );
      }

      if (error.name === "AbortError") {
        // Caller's signal aborted → cancellation; otherwise → timeout
        const abortError = config.signal?.aborted
          ? new CancelError("Request cancelled")
          : new TimeoutError("Request timed out");
        return fetchfullyResponse(
          "error",
          null,
          abortError,
          undefined,
          undefined,
          refetch
        );
      }

      if (error instanceof HttpError) {
        return fetchfullyResponse(
          "error",
          null,
          error,
          undefined,
          undefined,
          refetch
        );
      }

      return fetchfullyResponse(
        "error",
        null,
        error,
        undefined,
        undefined,
        refetch
      );
    } finally {
      clearTimeout(timeoutID);
    }
  }

  fetcher.defaults = factoryConfig;

  return attachActionMethods(fetcher as FetchfullyInstance);
}
