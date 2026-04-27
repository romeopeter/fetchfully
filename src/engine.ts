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

    const refetch = (override?: Partial<FetchfullyConfig>) =>
      fetcher({ ...initConfig, ...override });

    const requestQueryParameter = {
      query: config.query,
      queryArrayFormat: config.queryArrayFormat,
    };

    if (config.baseURL && config.url) {
      throw new Error(
        "Fetchfully: cannot set both 'baseURL' and 'url'. Use 'baseURL' with 'path' for path segments, or 'url' for a full URL."
      );
    }

    const maxRetries = config.retries ?? 0;
    const retryDelay = config.retryDelay ?? 1000;

    let result: FetchfullyResponse | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      // Fresh controller per attempt — aborted controllers cannot be reused
      const internalController = new AbortController();
      let timeoutID: ReturnType<typeof setTimeout> | undefined;

      if (config.signal) {
        if (config.signal.aborted) {
          internalController.abort(config.signal.reason);
        } else {
          config.signal.addEventListener("abort", () =>
            internalController.abort(config.signal?.reason)
          );
        }
      }

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
        } else if (typeof config.body === "string") {
          fetchConfig.body = config.body;
        } else {
          fetchConfig.body = JSON.stringify(config.body);
        }
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

        result =
          config.method !== "GET"
            ? await mutationQuery(originResponse, refetch)
            : await requestQuery(originResponse, refetch);

        break; // success — exit retry loop, response interrupts will run below
      } catch (error: any) {
        let fetchError: Error;
        let retryable = false;

        if (error instanceof TypeError) {
          if (
            error.message.includes("CORS") ||
            error.message.includes("cross-origin")
          ) {
            fetchError = new CorsError("CORS error occurred");
          } else if (error.message.includes("fetch failed")) {
            fetchError = new NetworkError("Network error occurred");
            retryable = true;
          } else {
            fetchError = error;
          }
        } else if (error.name === "AbortError") {
          if (config.signal?.aborted) {
            // User cancelled — never retry
            fetchError = new CancelError("Request cancelled");
          } else {
            fetchError = new TimeoutError("Request timed out");
            retryable = true;
          }
        } else if (error instanceof HttpError) {
          fetchError = error;
        } else {
          fetchError = error;
        }

        if (retryable && attempt < maxRetries) {
          await new Promise<void>((resolve) => setTimeout(resolve, retryDelay));
          continue;
        }

        result = fetchfullyResponse(
          "error",
          null,
          fetchError,
          undefined,
          undefined,
          refetch
        );
        break;
      } finally {
        clearTimeout(timeoutID);
      }
    }

    // Unreachable at runtime — `result` is always set inside the loop
    if (!result) {
      result = fetchfullyResponse(
        "error",
        null,
        new NetworkError("Request failed"),
        undefined,
        undefined,
        refetch
      );
    }

    return runResponseInterrupts(result, interrupts.response);
  }

  fetcher.defaults = factoryConfig;
  fetcher.interrupts = interrupts;

  return attachActionMethods(fetcher as FetchfullyInstance);
}
