import requestQuery from "./request-query";
import mutationQuery from "./mutation-query";
import { constructUrl } from "./utils/url-parameters";
import { mergeConfig } from "./utils/mergeConfig";
import {
  NetworkError,
  CorsError,
  TimeoutError,
  CancelError,
} from "./utils/custom-request-errors";
import { errorResponse, type ParsedResponse } from "./response";
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
  type RequestHeaders,
} from "./types";

/* ------------------------------------------------------------------------------------ */

// The URL that paths are joined onto: `baseURL` (trailing slashes removed) or `url`
const baseUrlOf = (config: FetchfullyConfig) =>
  config.baseURL ? config.baseURL.replace(/\/+$/, "") : config.url ?? "";

const toError = (value: unknown): Error =>
  value instanceof Error ? value : new Error(String(value));

// Bodies fetch() can send as they are
const isNativeBody = (body: unknown): body is BodyInit =>
  typeof body === "string" ||
  body instanceof FormData ||
  body instanceof Blob ||
  body instanceof URLSearchParams ||
  body instanceof ArrayBuffer ||
  ArrayBuffer.isView(body);

// GET sends no body. Anything fetch() can't send as it is (an object, an
// array) is sent as JSON.
const requestBody = ({ body, method }: FetchfullyConfig): BodyInit | undefined => {
  if (!body || method === "GET") return undefined;

  return isNativeBody(body) ? body : JSON.stringify(body);
};

const isJsonType = (value: unknown) =>
  String(value).split(";")[0].trim().toLowerCase() === "application/json";

// The default `Content-Type: application/json` doesn't describe a FormData,
// Blob, binary or URLSearchParams body, so it's dropped and fetch() sets the
// right one: the multipart boundary, the Blob's own type, or form encoding.
// FormData drops any Content-Type, since only fetch() knows the boundary.
const headersFor = (
  headers: RequestHeaders | undefined,
  body: BodyInit | undefined
): RequestHeaders | undefined => {
  if (!headers || body === undefined || typeof body === "string") return headers;

  return Object.fromEntries(
    Object.entries(headers).filter(
      ([name, value]) =>
        name.toLowerCase() !== "content-type" ||
        (!(body instanceof FormData) && !isJsonType(value))
    )
  );
};

// fetch() rejects with a TypeError whenever the network fails, and every
// runtime words it differently: "fetch failed" (Node), "Failed to fetch"
// (Chrome), "NetworkError when attempting to fetch resource." (Firefox),
// "Load failed" (Safari). So the type decides, not the wording. Browsers hide
// why a cross-origin request failed, so CorsError needs a message that says
// so. Anything else (an AbortError) passes through.
const fetchFailure = (error: unknown): unknown => {
  if (!(error instanceof TypeError)) return error;

  return /CORS|cross-origin/.test(error.message)
    ? new CorsError("CORS error occurred")
    : new NetworkError("Network error occurred");
};

/**
 * Creates an instance of the core fetcher function
 *
 * @param defaultConfig FetchfullyConfig
 *
 */
export function createFetch(
  factoryConfig: FetchfullyConfig = {}
): FetchfullyInstance {
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
    let fetchConfig: RequestInit;

    try {
      fullUrl = constructUrl(baseUrlOf(config), config.path, {
        query: config.query,
        queryArrayFormat: config.queryArrayFormat,
      });

      // No signal here: the in-flight registry gives each network request its
      // own, and this caller's signal only decides when the caller leaves
      const body = requestBody(config);

      fetchConfig = {
        method: config.method,
        body,
        headers: headersFor(config.headers, body),
        credentials: config.credentials,
        keepalive: config.keepalive,
        mode: config.mode,
      };

      // Input fetch() would reject (a bad URL, header or mode) fails here as a
      // plain TypeError, before any attempt, so a TypeError from fetch() itself
      // can only mean the network failed. The body is left out so a large
      // upload isn't copied just to be checked. Skipped where `Request` is
      // missing, e.g. a test environment that only mocks `fetch`.
      if (typeof Request === "function") {
        new Request(fullUrl, { ...fetchConfig, body: undefined });
      }
    } catch (error) {
      // Invalid input, or a query or body value JSON.stringify can't handle;
      // errors stay values
      const failed: FetchfullyResponse<T> = { ...errorResponse<T>(toError(error)), refetch };
      return runResponseInterrupts(failed, interrupts.response);
    }

    // Each caller gets its own response object with its own refetch
    const finalize = (response: ParsedResponse): FetchfullyResponse<T> => ({
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
          let originResponse: Response;

          try {
            originResponse = await fetch(fullUrl, { ...fetchConfig, signal });
          } catch (error) {
            throw fetchFailure(error);
          }

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
        // NetworkError and CorsError come from fetchFailure(); anything else
        // that isn't an abort (e.g. a body that fails to parse) is kept as is
        let fetchError: Error = error;
        let retryable = error instanceof NetworkError;

        if (error?.name === "AbortError") {
          if (config.signal?.aborted) {
            // User cancelled — never retry
            fetchError = new CancelError("Request cancelled");
          } else {
            fetchError = new TimeoutError("Request timed out");
            retryable = true;
          }
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
