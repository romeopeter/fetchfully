import { mergeConfig } from "./utils/mergeConfig";
import requestQuery from "./requestQuery";
import mutationQuery from "./mutationQuery";
import { constructUrl } from "./utils/url-parameters";
import {
  NetworkError,
  CorsError,
  TimeoutError,
  HttpError,
} from "./utils/custom-request-errors";
import { FetchfullyConfig, FetchfullyInstance } from "./types/config";

/* -------------------------------------------------------- */

/**
 * Creates and instance of the core fetcher function
 *
 * @param defaultConfig FetchfullyConfig
 *
 */
export function createFetcher(
  defaultConfig: FetchfullyConfig = {}
): Omit<FetchfullyInstance, "createFetcher"> {
  async function fetcher(requestConfig: FetchfullyConfig) {
    const mergedConfig = mergeConfig(defaultConfig, requestConfig);
    const abortRequest = new AbortController(); // Controller object to abort request
    let timeoutID; // used as ID to cancel timeout object created by setTimeout().

    const requestQueryParameter = {
      query: mergedConfig.query,
      queryArrayFormat: mergedConfig.queryArrayFormat,
    };

    const fetcherOptions: RequestInit = {
      method: mergedConfig.method,
      body: mergedConfig.body,
      headers: mergedConfig.headers,
      credentials: mergedConfig.credentials,
      keepalive: mergedConfig.keepalive,
      mode: mergedConfig.mode,
      signal: abortRequest.signal,
    };

    if (mergedConfig.method !== "GET") {
      fetcherOptions.body = JSON.stringify(mergedConfig.body);
    }

    try {
      if (mergedConfig.timeout) {
        timeoutID = setTimeout(
          () => abortRequest.abort(),
          mergedConfig.timeout
        );
      }

      let fullUrl = constructUrl(
        mergedConfig.url || "",
        mergedConfig.path,
        requestQueryParameter
      );

      //  Check for base URL, remove extra slash and then append sub url it
      if (mergedConfig.baseURL) {
        fullUrl = constructUrl(
          `${mergedConfig.baseURL.replace(/\/+$/, "")}`,
          mergedConfig.path,
          requestQueryParameter
        );
      }

      const response = await fetch(fullUrl, fetcherOptions);

      // Mutation request
      if (mergedConfig.method !== "GET") return mutationQuery(response);

      // Normal request
      return requestQuery(response);
    } catch (error: any) {
      if (error instanceof TypeError) {
        if (
          error.message.includes("CORS") ||
          error.message.includes("cross-origin")
        ) {
          throw new CorsError("CORS error occurred");
        } else if (error.message.includes("fetch failed")) {
          throw new NetworkError("Network error occurred");
        } else {
          throw error;
        }
      } else if (error.name === "AbortError") {
        throw new TimeoutError("Request timed out");
      } else if (error instanceof HttpError) {
        throw error;
      } else {
        throw error;
      }
    } finally {
      clearTimeout(timeoutID);
    }
  }

  fetcher.defaults = defaultConfig;

  return fetcher;
}
