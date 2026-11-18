// Common request headers type
export type RequestHeaders = {
  Authorization?: string;
  "Content-Type"?:
    | "application/json"
    | "application/x-www-form-urlencoded"
    | "multipart/form-data"
    | "text/html"
    | "text/plain";
  "Cache-Control"?: "no-cache" | "no-store" | "must-revalidate";
  [name: string]: any;
};

// Fetchfully core configuration
export type FetchfullyConfig = {
  baseURL?: string;
  url?: string;
  path?: string | string[];
  query?: Record<string, any>;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: string | FormData | Blob | ArrayBuffer | undefined;
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
  whenSuccessful?: (data: any) => void;
  whenFailed?: (data: Error) => void;
  whenDone?: (data: any, Error: null | Error) => void;
};

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

  // Headers and status
  statusCode?: number;
  headers?: RequestHeaders;

  // Control methods
  refetch?: (
    override?: Partial<FetchfullyConfig>,
  ) => Promise<FetchfullyResponse<T>>;
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

/** Anything callable like a Fetchfully instance. */
export type QueryFetcher<T = any> = (
  config: FetchfullyConfig,
) => Promise<FetchfullyResponse<T>>;

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
  create: (config?: FetchfullyConfig) => FetchfullyInstance;
  interrupts: Interrupts;
}
