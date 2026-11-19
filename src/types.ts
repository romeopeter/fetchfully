// Common request headers type. The listed values are editor suggestions;
// `(string & {})` accepts any other value without losing them.
export type RequestHeaders = {
  Authorization?: string;
  "Content-Type"?:
    | "application/json"
    | "application/x-www-form-urlencoded"
    | "multipart/form-data"
    | "text/html"
    | "text/plain"
    | (string & {});
  "Cache-Control"?: "no-cache" | "no-store" | "must-revalidate" | (string & {});
  [name: string]: any;
};

/**
 * A request body. Strings and bodies `fetch` can send natively (`FormData`,
 * `Blob`, `ArrayBuffer`, typed arrays, `URLSearchParams`) are sent as they
 * are; any other object or array is sent as JSON.
 */
export type RequestBody =
  | string
  | FormData
  | Blob
  | ArrayBuffer
  | ArrayBufferView
  | URLSearchParams
  | object;

// Fetchfully core configuration
export type FetchfullyConfig = {
  baseURL?: string;
  url?: string;
  path?: string | string[];
  query?: Record<string, any>;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  /** Ignored for GET. See `RequestBody` for how each kind is sent. */
  body?: RequestBody;
  headers?: RequestHeaders;
  credentials?: "same-origin" | "omit" | "include";
  keepalive?: boolean;
  mode?: "same-origin" | "cors" | "no-cors";
  timeout?: number;
  signal?: AbortSignal;
  queryArrayFormat?: "brackets" | "comma" | "repeat" | "none";
  retries?: number;
  retryDelay?: number;
  /**
   * Share one network call between identical GET requests in flight at the
   * same time (same URL, query, headers, credentials, and mode). Each caller
   * still gets its own response object, timeout, cancellation, and response
   * interrupts, but the parsed `data` is the same object, so treat it as
   * read-only. Not a cache: requests that don't overlap each hit the network.
   * Ignored for non-GET methods. Default: `false`.
   */
  dedupe?: boolean;
  /**
   * Keep successful GET responses in this instance's in-memory cache and serve
   * them without a network request while fresh. Off by default. `false` turns
   * it off for one call (no read, no write). This is Fetchfully's own cache,
   * not the browser HTTP cache. Caching also shares in-flight requests, as
   * `dedupe` does.
   */
  cache?: CacheOptions | false;
  /** @deprecated Never implemented: setting it has no effect. Removed in 2.0. */
  whenSuccessful?: (data: any) => void;
  /** @deprecated Never implemented: setting it has no effect. Removed in 2.0. */
  whenFailed?: (data: Error) => void;
  /** @deprecated Never implemented: setting it has no effect. Removed in 2.0. */
  whenDone?: (data: any, Error: null | Error) => void;
};

export type CacheOptions = {
  /**
   * How long, in ms, a stored response is served without a network request.
   * `0` always goes to the network but still stores the result; `Infinity`
   * never expires (until invalidated or evicted).
   */
  staleTime: number;
  /**
   * Most responses kept per instance; the least recently used is evicted
   * first. Read from the instance config (ignored per call). Default: 100.
   */
  maxEntries?: number;
};

/** A request path or URL prefix, or a predicate on each cached request URL. */
export type InvalidateTarget = string | ((requestUrl: string) => boolean);

/** Per-instance response cache, available as `instance.cache`. */
export interface FetchfullyCache {
  /**
   * Drops matching responses and re-runs subscribed queries that last
   * requested a matching URL. A string is resolved like a request path
   * against the instance's base URL and matches it plus anything below it:
   * `"users"` matches `users`, `users/1`, and `users?page=2`, not `users-admin`.
   * Works as a "this data changed" signal even when caching is off.
   */
  invalidate(target: InvalidateTarget): void;
  /** Drops every response and re-runs every subscribed query. */
  clear(): void;
  /**
   * Called with a URL matcher on every `invalidate` / `clear`. Returns an
   * unsubscribe function. `createQuery` uses this to re-run itself.
   */
  onInvalidate(listener: (matches: (requestUrl: string) => boolean) => void): () => void;
}

// Request type
export type RequestStatus = "idle" | "loading" | "success" | "error";

// Fields shared by every settled response
type FetchfullyResponseBase<T> = {
  /**
   * @deprecated An awaited response has always finished, so this is always
   * `true`. Use `createQuery()` to track live request state. Removed in 2.0.
   */
  isIdle: boolean;
  /**
   * @deprecated An awaited response has always finished, so this is always
   * `false`. Use `createQuery()` to track live request state. Removed in 2.0.
   */
  isLoading: boolean;

  /** The HTTP status. `undefined` when no response arrived. */
  statusCode?: number;
  /** The response headers. `undefined` when no response arrived. */
  headers?: Headers;
  /**
   * The URL Fetchfully requested (after path and query building).
   * `undefined` only when the URL couldn't be built.
   */
  requestUrl?: string;

  /**
   * Sends the same request again. `override` replaces the given top-level
   * options for that run. With caching on, it skips the cache read.
   */
  refetch: (
    override?: Partial<FetchfullyConfig>,
  ) => Promise<FetchfullyResponse<T>>;
  /** @deprecated Never implemented: always `undefined`. Pass a `signal` to cancel. Removed in 2.0. */
  cancel?: () => void;
};

export type FetchfullySuccessResponse<T = any> = FetchfullyResponseBase<T> & {
  status: "success";
  isSuccess: true;
  isError: false;
  data: T;
  error: null;
};

export type FetchfullyErrorResponse<T = any> = FetchfullyResponseBase<T> & {
  status: "error";
  isSuccess: false;
  isError: true;
  data: null;
  error: Error;
};

/**
 * The settled result of a request. Check `isSuccess` (or `status`) to narrow:
 * on success `data` is `T`, on error `error` is an `Error`.
 */
export type FetchfullyResponse<T = any> =
  | FetchfullySuccessResponse<T>
  | FetchfullyErrorResponse<T>;

/* ---------------------------------------------------------------------- */
// Query (framework-agnostic observable request state)

type QueryFlags<S extends RequestStatus> = {
  isIdle: S extends "idle" ? true : false;
  isLoading: S extends "loading" ? true : false;
  isSuccess: S extends "success" ? true : false;
  isError: S extends "error" ? true : false;
};

/**
 * Snapshot of a query's live state.
 *
 * - `idle`: `run()` has not been called yet.
 * - `loading`: a request is in flight; `data` keeps the previous result, if any.
 * - `success`: the latest request succeeded.
 * - `error`: the latest request failed; `data` keeps the previous result, if any.
 */
export type QueryState<T = any> =
  | ({ status: "idle"; data: null; error: null } & QueryFlags<"idle">)
  | ({ status: "loading"; data: T | null; error: null } & QueryFlags<"loading">)
  | ({ status: "success"; data: T; error: null } & QueryFlags<"success">)
  | ({ status: "error"; data: T | null; error: Error } & QueryFlags<"error">);

export type QueryListener<T = any> = (state: QueryState<T>) => void;

/**
 * Framework-agnostic observable request. The `subscribe` / `getSnapshot` pair
 * plugs into React's `useSyncExternalStore`, works as a Svelte store as-is,
 * and adapts to Vue, Solid, and Angular in a few lines.
 */
export interface Query<T = any> {
  /** Current state. The same object is returned until the state changes. */
  getSnapshot(): QueryState<T>;
  /**
   * Calls `listener` immediately with the current state, then on every change.
   * Returns an unsubscribe function.
   */
  subscribe(listener: QueryListener<T>): () => void;
  /**
   * Sends the request, merging `override` over the query's config. Aborts any
   * request already in flight (the newest call wins). Always resolves, never
   * rejects; failures end up in `state.error`.
   */
  run(override?: Partial<FetchfullyConfig>): Promise<QueryState<T>>;
  /** Aborts the in-flight request, if any. The state becomes a `CancelError`. */
  abort(reason?: unknown): void;
}

/**
 * Anything callable like a Fetchfully instance. When it also has a `cache`
 * (as instances do), queries re-run on matching invalidations.
 */
export type QueryFetcher<T = any> = ((
  config: FetchfullyConfig,
) => Promise<FetchfullyResponse<T>>) & {
  cache?: Pick<FetchfullyCache, "onInvalidate">;
};

/* ---------------------------------------------------------------------- */
// Query groups (several queries observed as one)

/** The data type of each query in a tuple of queries. */
export type QueryGroupData<Q extends readonly Query<any>[]> = {
  [K in keyof Q]: Q[K] extends Query<infer T> ? T : never;
};

type NullableEach<D extends readonly unknown[]> = {
  [K in keyof D]: D[K] | null;
};

type QueryGroupBase<D extends readonly unknown[]> = {
  /** Each query's own snapshot, in order. */
  states: { [K in keyof D]: QueryState<D[K]> };
  /** Each query's error, or `null`, in order. */
  errors: { [K in keyof D]: Error | null };
};

/**
 * Combined snapshot of a query group.
 *
 * - `loading`: at least one query is in flight.
 * - `error`: none in flight, at least one failed; `error` is the first failure.
 * - `success`: every query succeeded; `data` holds every result.
 * - `idle`: otherwise (some query has not run yet).
 */
export type QueryGroupState<D extends readonly unknown[] = unknown[]> =
  QueryGroupBase<D> &
    (
      | ({ status: "idle"; data: NullableEach<D>; error: null } & QueryFlags<"idle">)
      | ({ status: "loading"; data: NullableEach<D>; error: null } & QueryFlags<"loading">)
      | ({ status: "success"; data: D; error: null } & QueryFlags<"success">)
      | ({ status: "error"; data: NullableEach<D>; error: Error } & QueryFlags<"error">)
    );

export type QueryGroupListener<D extends readonly unknown[] = unknown[]> = (
  state: QueryGroupState<D>,
) => void;

/** Several queries observed as one. Same contract as `Query`. */
export interface QueryGroup<D extends readonly unknown[] = unknown[]> {
  /** Current combined state. Same object until a query's state changes. */
  getSnapshot(): QueryGroupState<D>;
  /** Calls `listener` immediately, then on every change. Returns unsubscribe. */
  subscribe(listener: QueryGroupListener<D>): () => void;
  /** Runs every query in parallel. Never rejects. */
  run(): Promise<QueryGroupState<D>>;
  /** Aborts every query's in-flight request. */
  abort(reason?: unknown): void;
}

/**
 * Per-call options for the shortcut methods. `path`, `method`, `query`, and
 * `body` come from the positional arguments, so they are not accepted here.
 */
export type RequestOptions = Omit<
  FetchfullyConfig,
  "path" | "method" | "query" | "body"
>;

export interface RequestMethods {
  get<T = any>(
    path: string,
    query?: Record<string, any>,
    options?: RequestOptions,
  ): Promise<FetchfullyResponse<T>>;
  post<T = any>(
    path: string,
    data?: any,
    query?: Record<string, any>,
    options?: RequestOptions,
  ): Promise<FetchfullyResponse<T>>;
  put<T = any>(
    path: string,
    data?: any,
    query?: Record<string, any>,
    options?: RequestOptions,
  ): Promise<FetchfullyResponse<T>>;
  patch<T = any>(
    path: string,
    data?: any,
    query?: Record<string, any>,
    options?: RequestOptions,
  ): Promise<FetchfullyResponse<T>>;
  delete<T = any>(
    path: string,
    query?: Record<string, any>,
    options?: RequestOptions,
  ): Promise<FetchfullyResponse<T>>;
}

// Interrupts (network interceptors) types
export type RequestInterruptHandler = (
  config: FetchfullyConfig,
) => FetchfullyConfig | Promise<FetchfullyConfig>;

export type ResponseInterruptHandlers<T = any> = {
  onFulfilled?: (
    response: FetchfullyResponse<T>,
  ) => FetchfullyResponse<T> | Promise<FetchfullyResponse<T>>;
  onRejected?: (
    response: FetchfullyResponse<T>,
  ) => FetchfullyResponse<T> | Promise<FetchfullyResponse<T>>;
};

export type Interrupts = {
  request: import("./interrupts").RequestInterruptStack<RequestInterruptHandler>;
  response: import("./interrupts").ResponseInterruptStack;
};

// Fetchfully instance structure
export interface FetchfullyInstance extends RequestMethods {
  <T = any>(config: FetchfullyConfig): Promise<FetchfullyResponse<T>>;
  defaults: FetchfullyConfig;
  cache: FetchfullyCache;
  interrupts: Interrupts;
}

/** The default `Fetchfully` export: an instance that can also create instances. */
export interface FetchfullyDefaultInstance extends FetchfullyInstance {
  /** Creates an instance with its own config (merged over `defaults`), interrupts, and cache. */
  create: (config?: FetchfullyConfig) => FetchfullyInstance;
}
