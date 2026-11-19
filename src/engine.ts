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
import { errorResponse } from "./response";
import { attachActionMethods } from "./consumable-methods";
import { createInFlight, requestKey } from "./in-flight";
import { createCache } from "./cache";
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

// The URL that paths are joined onto: `baseURL` (trailing slashes removed) or `url`
const baseUrlOf = (config: FetchfullyConfig) =>
  config.baseURL ? config.baseURL.replace(/\/+$/, "") : config.url ?? "";

const toError = (value: unknown): Error =>
  value instanceof Error ? value : new Error(String(value));

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
  const inFlight = createInFlight();
  const cache = createCache({
    // Read lazily, so `Fetchfully.defaults.cache = {...}` set later applies
    getMaxEntries: () => (factoryConfig.cache ? factoryConfig.cache.maxEntries : undefined),
    resolvePath: (path) => constructUrl(baseUrlOf(factoryConfig), path),
  });

  async function fetcher<T = any>(
    initConfig: FetchfullyConfig
  ): Promise<FetchfullyResponse<T>> {
    const merged = mergeConfig(factoryConfig, initConfig);
    const config = await runRequestInterrupts(merged, interrupts.request);

    // Refetching always goes to the network; with caching on, it skips the
    // cache read but still updates the stored entry
    const refetch = (override?: Partial<FetchfullyConfig>) =>
      fetcher<T>({
        ...initConfig,
        ...(config.cache ? { cache: { ...config.cache, staleTime: 0 } } : {}),
        ...override,
      });

    if (config.baseURL && config.url) {
      throw new Error(
        "Fetchfully: cannot set both 'baseURL' and 'url'. Use 'baseURL' with 'path' for path segments, or 'url' for a full URL."
      );
    }

    let fullUrl: string;

    try {
      fullUrl = constructUrl(baseUrlOf(config), config.path, {
        query: config.query,
        queryArrayFormat: config.queryArrayFormat,
      });
    } catch (error) {
      // e.g. a query value JSON.stringify can't handle; errors stay values
      const failed = errorResponse<T>(toError(error), undefined, undefined, refetch);
      return runResponseInterrupts(failed, interrupts.response);
    }

    // Each caller gets its own response object with its own refetch
    const finalize = (response: FetchfullyResponse): FetchfullyResponse<T> => ({
      ...response,
      requestUrl: fullUrl,
      refetch,
    });

    const isGet = config.method === "GET";
    const cacheOptions = isGet && config.cache ? config.cache : null;
    const key =
      isGet && (config.dedupe || cacheOptions) ? requestKey(config, fullUrl) : null;

    if (cacheOptions && key !== null) {
      const hit = cache.read(key, cacheOptions.staleTime ?? 0);
      if (hit) return runResponseInterrupts(finalize(hit), interrupts.response);
    }

    const maxRetries = config.retries ?? 0;
    const retryDelay = config.retryDelay ?? 1000;

    let result: FetchfullyResponse<T> | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      // Fresh controller per attempt — aborted controllers cannot be reused
      const internalController = new AbortController();
      const forwardAbort = () => internalController.abort(config.signal?.reason);
      let timeoutID: ReturnType<typeof setTimeout> | undefined;

      // No signal here: the in-flight registry gives each network request its
      // own, and this caller's signal only decides when the caller leaves
      const fetchConfig: RequestInit = {
        method: config.method,
        body: undefined,
        headers: config.headers,
        credentials: config.credentials,
        keepalive: config.keepalive,
        mode: config.mode,
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
        // Added inside `try` so `finally` always removes it: a long-lived
        // caller signal would otherwise keep one listener (and this request's
        // config) per attempt
        if (config.signal?.aborted) {
          internalController.abort(config.signal.reason);
        } else {
          config.signal?.addEventListener("abort", forwardAbort, { once: true });
        }

        if (config.timeout) {
          timeoutID = setTimeout(() => internalController.abort(), config.timeout);
        }

        // Taken before the request starts: an invalidation after this point
        // stops the result from being cached and from being joined below
        const epoch = cache.epoch();

        const execute = async (signal: AbortSignal) => {
          const originResponse = await fetch(fullUrl, { ...fetchConfig, signal });
          const response = isGet
            ? await requestQuery(originResponse)
            : await mutationQuery(originResponse);

          if (cacheOptions && key !== null && response.isSuccess) {
            cache.write(key, fullUrl, response, epoch);
          }

          return response;
        };

        // Joins an identical in-flight GET when `dedupe` or `cache` is on;
        // otherwise runs alone. Rejects with an AbortError if this caller's
        // signal or timeout fires first.
        const shared = await inFlight.join(
          key === null ? null : `${epoch} ${key}`,
          execute,
          internalController.signal
        );

        result = finalize(shared);

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

        result = finalize(errorResponse(fetchError));
        break;
      } finally {
        clearTimeout(timeoutID);
        config.signal?.removeEventListener("abort", forwardAbort);
      }
    }

    // Unreachable at runtime — `result` is always set inside the loop
    if (!result) {
      result = finalize(errorResponse(new NetworkError("Request failed")));
    }

    return runResponseInterrupts(result, interrupts.response);
  }

  fetcher.defaults = factoryConfig;
  fetcher.interrupts = interrupts;
  fetcher.cache = cache.public;

  return attachActionMethods(fetcher as FetchfullyInstance);
}
