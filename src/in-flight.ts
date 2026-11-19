import type { FetchfullyConfig, FetchfullyResponse } from "./types";

/* ---------------------------------------------------------------------- */

/** One network attempt: fetch + parse. Receives the shared request's signal. */
export type Execute = (signal: AbortSignal) => Promise<FetchfullyResponse>;

type Entry = {
  promise: Promise<FetchfullyResponse>;
  controller: AbortController;
  consumers: number;
};

export type InFlight = {
  /**
   * Runs `execute`, or joins an identical request already in flight when `key`
   * matches one. Each caller races the shared result against its own signal:
   * a caller that aborts leaves on its own, and the network request is only
   * aborted once every caller has left. A `null` key never shares.
   */
  join(
    key: string | null,
    execute: Execute,
    callerSignal: AbortSignal
  ): Promise<FetchfullyResponse>;
};

const abortError = () =>
  new DOMException("The operation was aborted.", "AbortError");

/**
 * Builds the key that identifies a GET request for sharing and caching. It
 * covers everything that can change the response: URL (with query),
 * credentials, mode, and headers (so a different auth header never shares).
 */
export function requestKey(config: FetchfullyConfig, fullUrl: string): string {
  const headers = Object.entries(config.headers ?? {})
    .map(([name, value]) => [name.toLowerCase(), String(value)])
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));

  return JSON.stringify([
    "GET",
    fullUrl,
    config.credentials ?? "",
    config.mode ?? "",
    headers,
  ]);
}

/**
 * Creates a registry of in-flight requests. One per Fetchfully instance, so
 * separate instances never share requests.
 */
export function createInFlight(): InFlight {
  const entries = new Map<string, Entry>();

  // Remove an entry only if it is still the registered one for its key
  const release = (key: string | null, entry: Entry) => {
    if (key !== null && entries.get(key) === entry) entries.delete(key);
  };

  const start = (key: string | null, execute: Execute): Entry => {
    const controller = new AbortController();
    const entry: Entry = {
      controller,
      consumers: 0,
      promise: execute(controller.signal),
    };

    // Each consumer observes the outcome through its own race in join().
    // Handling both outcomes here also keeps a rejection with no consumers
    // left (all aborted) from being reported as unhandled.
    const settle = () => release(key, entry);
    entry.promise.then(settle, settle);

    if (key !== null) entries.set(key, entry);
    return entry;
  };

  return {
    join(key, execute, callerSignal) {
      if (callerSignal.aborted) return Promise.reject(abortError());

      const entry = (key !== null && entries.get(key)) || start(key, execute);
      entry.consumers++;

      return new Promise<FetchfullyResponse>((resolve, reject) => {
        const leave = () => {
          entry.consumers--;

          if (entry.consumers === 0) {
            release(key, entry);
            entry.controller.abort();
          }

          reject(abortError());
        };

        callerSignal.addEventListener("abort", leave, { once: true });

        entry.promise.then(
          (response) => {
            callerSignal.removeEventListener("abort", leave);
            resolve(response);
          },
          (error: unknown) => {
            callerSignal.removeEventListener("abort", leave);
            reject(error);
          }
        );
      });
    },
  };
}
