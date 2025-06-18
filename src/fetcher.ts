import { mergeConfig } from "./utils/mergeConfig";
import requestQuery from "./request-query";
import mutationQuery from "./mutation-query";
import { constructUrl } from "./utils/url-parameters";
import {
  NetworkError,
  CorsError,
  TimeoutError,
  HttpError,
} from "./utils/custom-request-errors";
import { attachActionMethods } from "./consumable-methods";
import { FetchfullyConfig, FetchfullyInstance } from "./types/config";
import createResponse from "./response";
import { FetchfullyResponse } from "./types/fetchfully-response";

/* -------------------------------------------------------------------------------- */

/**
 * Creates and instance of the core fetcher function
 *
 * @param defaultConfig FetchfullyConfig
 *
 */
export function createFetcher(
  defaultConfig: FetchfullyConfig = {}
): Omit<FetchfullyInstance, "create"> {
  async function fetcher(
    requestConfig: FetchfullyConfig
  ): Promise<FetchfullyResponse> {
    let responseState: FetchfullyResponse;
    const mergedConfig = mergeConfig(defaultConfig, requestConfig);
    const abortRequest = new AbortController(); // Controller object to abort request
    let timeoutID; // used as ID to cancel timeout object created by setTimeout().

    const requestQueryParameter = {
      query: mergedConfig.query,
      queryArrayFormat: mergedConfig.queryArrayFormat,
    };

    const fetcherOptions: RequestInit = {
      method: mergedConfig.method,
      body:
        mergedConfig.body && mergedConfig.method !== "GET"
          ? JSON.stringify(mergedConfig.body)
          : undefined,
      headers: mergedConfig.headers,
      credentials: mergedConfig.credentials,
      keepalive: mergedConfig.keepalive,
      mode: mergedConfig.mode,
      signal: abortRequest.signal,
    };

    const refetch = () => fetcher(requestConfig);

    try {
      responseState = createResponse(
        "loading",
        null,
        null,
        undefined,
        undefined,
        refetch
      );

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

      //  Check for base URL, remove extra slash and append sub url
      if (mergedConfig.baseURL) {
        fullUrl = constructUrl(
          `${mergedConfig.baseURL.replace(/\/+$/, "")}`,
          mergedConfig.path,
          requestQueryParameter
        );
      }

      const response = await fetch(fullUrl, fetcherOptions);

      // Normal request
      const data = requestQuery(response);

      // Mutation request
      if (mergedConfig.method !== "GET") {
        const data = mutationQuery(response);
        responseState = createResponse(
          "success",
          data,
          null,
          response.status,
          response.headers,
          refetch
        );
      }

      responseState = createResponse(
        "success",
        data,
        null,
        response.status,
        response.headers,
        refetch
      );

      return responseState;
    } catch (error: any) {
      if (error instanceof TypeError) {
        if (
          error.message.includes("CORS") ||
          error.message.includes("cross-origin")
        ) {
          const corsError = new CorsError("CORS error occurred");

          return createResponse(
            "error",
            null,
            corsError,
            undefined,
            undefined,
            refetch
          );
        } else if (error.message.includes("fetch failed")) {
          const networkError = new NetworkError("Network error occurred");
          return createResponse(
            "error",
            null,
            networkError,
            undefined,
            undefined,
            refetch
          );
        }

        return createResponse(
          "error",
          null,
          error,
          undefined,
          undefined,
          refetch
        );
      }

      if (error.name === "AbortError") {
        const timeoutError = new TimeoutError("Request timed out");
        return createResponse(
          "error",
          null,
          timeoutError,
          undefined,
          undefined,
          refetch
        );
      }

      if (error instanceof HttpError) {
        return createResponse(
          "error",
          null,
          error,
          undefined,
          undefined,
          refetch
        );
      }

      return createResponse(
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

  fetcher.defaults = defaultConfig;

  return attachActionMethods(fetcher as FetchfullyInstance);
}
