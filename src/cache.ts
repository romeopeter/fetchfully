import type { FetchfullyCache, InvalidateTarget } from "./types";
import type { ParsedResponse } from "./response";

/* ---------------------------------------------------------------------- */

type Entry = {
  requestUrl: string;
  response: ParsedResponse;
  storedAt: number;
};

type UrlMatcher = (requestUrl: string) => boolean;
type InvalidateListener = (matches: UrlMatcher) => void;

export type Cache = {
  /** A stored response younger than `staleTime` ms, or `undefined`. */
  read(key: string, staleTime: number): ParsedResponse | undefined;
  /**
   * Stores a response unless the cache was invalidated after `epoch` was
   * taken, so a request that started before an invalidation never stores
   * data from before it.
   */
  write(
    key: string,
    requestUrl: string,
    response: ParsedResponse,
    epoch: number
  ): void;
  /** Changes on every invalidate / clear. Take it before a request starts. */
  epoch(): number;
  /** The part exposed as `instance.cache`. */
  public: FetchfullyCache;
};

type CacheSetup = {
  /** Read on every write, so later changes to the instance config apply. */
  getMaxEntries: () => number | undefined;
  /** Resolves a relative path like a request path, against the base URL. */
  resolvePath: (path: string) => string;
};

const DEFAULT_MAX_ENTRIES = 100;
const ABSOLUTE_URL = /^[a-z][a-z\d+.-]*:\/\//i;

/**
 * Creates one instance's response cache: an LRU map (via Map insertion
 * order) from request key to the shared, successful response.
 */
export function createCache({ getMaxEntries, resolvePath }: CacheSetup): Cache {
  const entries = new Map<string, Entry>();
  const listeners = new Set<InvalidateListener>();
  let epoch = 0;

  const toMatcher = (target: InvalidateTarget): UrlMatcher => {
    if (typeof target === "function") return target;

    const base = ABSOLUTE_URL.test(target) ? target : resolvePath(target);
    const below = base.endsWith("/") ? base : `${base}/`;

    // Segment boundaries only: "users" matches "users/1" and "users?page=2",
    // never "users-admin"
    return (url) =>
      url === base || url.startsWith(below) || url.startsWith(`${base}?`);
  };

  const invalidateWhere = (matches: UrlMatcher) => {
    epoch++;

    for (const [key, entry] of entries) {
      if (matches(entry.requestUrl)) entries.delete(key);
    }

    // Copy so a listener can unsubscribe during notification safely
    for (const listener of [...listeners]) listener(matches);
  };

  return {
    read(key, staleTime) {
      const entry = entries.get(key);
      if (!entry || Date.now() - entry.storedAt >= staleTime) return undefined;

      // Move to the end: most recently used
      entries.delete(key);
      entries.set(key, entry);

      return entry.response;
    },

    write(key, requestUrl, response, startedAt) {
      if (startedAt !== epoch) return;

      entries.delete(key);
      entries.set(key, { requestUrl, response, storedAt: Date.now() });

      const maxEntries = Math.max(0, getMaxEntries() ?? DEFAULT_MAX_ENTRIES);

      for (const oldest of entries.keys()) {
        if (entries.size <= maxEntries) break;
        entries.delete(oldest);
      }
    },

    epoch: () => epoch,

    public: {
      invalidate: (target) => invalidateWhere(toMatcher(target)),
      clear: () => invalidateWhere(() => true),

      onInvalidate(listener) {
        listeners.add(listener);
        return () => {
          listeners.delete(listener);
        };
      },
    },
  };
}
