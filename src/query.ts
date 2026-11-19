import type {
  FetchfullyConfig,
  Query,
  QueryFetcher,
  QueryListener,
  QueryState,
} from "./types";

/* ---------------------------------------------------------------------- */

const IDLE_STATE: QueryState<never> = {
  status: "idle",
  data: null,
  error: null,
  isIdle: true,
  isLoading: false,
  isSuccess: false,
  isError: false,
};

const loadingState = <T>(data: T | null): QueryState<T> => ({
  status: "loading",
  data,
  error: null,
  isIdle: false,
  isLoading: true,
  isSuccess: false,
  isError: false,
});

const successState = <T>(data: T): QueryState<T> => ({
  status: "success",
  data,
  error: null,
  isIdle: false,
  isLoading: false,
  isSuccess: true,
  isError: false,
});

const errorState = <T>(error: Error, data: T | null): QueryState<T> => ({
  status: "error",
  data,
  error,
  isIdle: false,
  isLoading: false,
  isSuccess: false,
  isError: true,
});

const toError = (value: unknown): Error =>
  value instanceof Error ? value : new Error(String(value));

/**
 * Creates a framework-agnostic observable request.
 *
 * Nothing is sent until `run()` is called. State snapshots keep the same
 * object identity until the state changes, which `useSyncExternalStore` needs.
 *
 * @example
 * const users = createQuery<User[]>(Fetchfully, { path: "/users" });
 * users.subscribe((state) => render(state));
 * await users.run();
 * await users.run({ query: { page: 2 } }); // keeps old data while loading
 *
 * @param fetcher A Fetchfully instance (or anything with the same call signature).
 * @param config Base request config; `run(override)` merges over it.
 */
export function createQuery<T = any>(
  fetcher: QueryFetcher<T>,
  config: FetchfullyConfig = {}
): Query<T> {
  let state: QueryState<T> = IDLE_STATE;
  let controller: AbortController | null = null;
  const listeners = new Set<QueryListener<T>>();

  // For re-running on invalidation: what the last run asked for and requested
  let lastOverride: Partial<FetchfullyConfig> = {};
  let lastUrl: string | null = null;
  let stopWatching: (() => void) | null = null;

  const setState = (next: QueryState<T>) => {
    state = next;
    // Copy so a listener can unsubscribe during notification safely
    for (const listener of [...listeners]) listener(state);
  };

  const run: Query<T>["run"] = async (override = {}) => {
    controller?.abort(); // the newest run wins

    const current = new AbortController();
    controller = current;
    lastOverride = override;

    const merged = { ...config, ...override };
    const externalSignal = merged.signal;
    const forwardAbort = () => current.abort(externalSignal?.reason);

    if (externalSignal?.aborted) {
      current.abort(externalSignal.reason);
    } else {
      externalSignal?.addEventListener("abort", forwardAbort, { once: true });
    }

    setState(loadingState(state.data));

    let next: QueryState<T>;
    let requestUrl: string | undefined;

    try {
      const response = await fetcher({ ...merged, signal: current.signal });
      requestUrl = response.requestUrl;

      next = response.isSuccess
        ? successState(response.data)
        : errorState(response.error, state.data);
    } catch (error) {
      // The engine throws on invalid config, and interrupts may throw.
      // Surface it as state so run() keeps its never-rejects contract.
      next = errorState(toError(error), state.data);
    } finally {
      externalSignal?.removeEventListener("abort", forwardAbort);
    }

    // A newer run() took over while this one was in flight; drop this result
    if (controller !== current) return state;

    controller = null;
    lastUrl = requestUrl ?? lastUrl;
    setState(next);

    return state;
  };

  // Re-run when the instance's cache invalidates what this query last showed
  const onInvalidate = (matches: (requestUrl: string) => boolean) => {
    if (lastUrl !== null && matches(lastUrl)) void run(lastOverride);
  };

  return {
    getSnapshot: () => state,

    subscribe(listener) {
      listeners.add(listener);

      // Only watch for invalidations while someone is subscribed, so an unused
      // query never refetches and the cache doesn't keep it alive
      if (stopWatching === null && fetcher.cache) {
        stopWatching = fetcher.cache.onInvalidate(onInvalidate);
      }

      listener(state); // Svelte's store contract requires an immediate call

      return () => {
        if (!listeners.delete(listener)) return;

        if (listeners.size === 0) {
          stopWatching?.();
          stopWatching = null;
        }
      };
    },

    run,

    abort(reason) {
      controller?.abort(reason);
    },
  };
}
