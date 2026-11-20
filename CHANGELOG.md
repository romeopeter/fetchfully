# Changelog

## 1.8.0 (2026-11-20)

This release adds live request status, request deduplication, and an opt-in response cache. It also fixes bugs in URL building, request bodies, headers, and error handling. JavaScript code written for 1.7.0 keeps working. TypeScript projects may need small changes, listed under [Upgrading from 1.7.0](#upgrading-from-170).

The [README](README.md) is now a full manual, with a reference for every option.

### Added

- **`createQuery(fetcher, config)`**: a request with live status (`idle`, `loading`, `success`, `error`) exposed through `subscribe` and `getSnapshot`. It works with React's `useSyncExternalStore`, as a Svelte store, and with Vue, Solid, and Angular in a few lines. Nothing is sent until `run()`, and the newest `run()` wins.
- **`combineQueries([...queries])`**: several queries observed as one, with a combined status.
- **`dedupe: true`**: identical GET requests that are in flight at the same time share one network call. Off by default.
- **`cache: { staleTime, maxEntries? }`**: a per-instance memory cache for successful GET responses. Off by default.
  - `instance.cache.invalidate(path | url | predicate)` and `instance.cache.clear()` drop entries.
  - Subscribed queries showing invalidated data refresh themselves. This works with caching off too.
- **Error classes are exported:** `HttpError`, `NetworkError`, `TimeoutError`, `CancelError`, and `CorsError`, for `instanceof` checks.
- **Shortcut methods take per-call options** as a last argument, for example `api.get("/users", { page: 2 }, { signal })`.
- **`refetch(override)`** takes options to change for that run, for example `res.refetch({ query: { page: 2 } })`.
- **`res.requestUrl`**: the URL Fetchfully requested.
- **TypeScript projects that compile to CommonJS** can import the package with `node16` or `nodenext` module resolution. Before, this failed with error TS1479.

### Fixed

- **URLs:** `api.get("/users")` requested `…//users`, with a double slash. Slashes at the edges of path segments are now trimmed.
- **Query strings:** a `null` or `undefined` query value broke the URL (`…/usersundefined`). Such values are now skipped.
- **Network errors in browsers:** a network failure came back as a bare `TypeError`, and `retries` never retried it. Each browser words the failure differently, and only Node's wording was recognised. Every runtime's network failure is now a `NetworkError`, and it's retried.
- **Request bodies:** `Blob`, `File`, `ArrayBuffer`, and `URLSearchParams` bodies were sent as `"{}"`, and typed arrays (including Node's `Buffer`) as an object of byte indexes. They're now sent as they are.
- **Uploads:** `FormData` was sent with `Content-Type: application/json`, so servers couldn't find the multipart boundary. `fetch` now sets `Content-Type` for `FormData`, and the JSON default is left off `Blob`, binary, and `URLSearchParams` bodies too.
- **Mutation status codes:** a POST, PUT, PATCH, or DELETE answered with a 2xx other than 200, 201, 202, or 204 (a 203, for example) resolved with `status: "loading"` and no data. Any 2xx, or 304, is now a success, and every other status is an `HttpError`.
- **Header names** merged case-sensitively. A call's `content-type` was sent beside the default `Content-Type` as `application/json, text/csv`, and an interrupt's `Authorization` beside an instance's `authorization` sent both tokens. Header names now match case-insensitively.
- **`undefined` headers:** a header set to `undefined` was sent as the text `"undefined"`. It's now left out, which is how to drop a default header for a call or a whole instance.
- **Media responses:** `video/*` and `audio/*` responses were decoded as text, which corrupted them. They're now `Blob`s, like `image/*`.
- **Invalid input:** a malformed URL or header is no longer sent. It comes back as the runtime's own `TypeError` and isn't retried.
- **Unserialisable bodies:** a body that `JSON.stringify` can't handle made the promise reject. It's now an error response.
- **Signal listeners:** every request left an `abort` listener on the `signal` you passed, so a signal reused across many requests kept growing. Listeners are now removed.
- **Error stacks:** `NetworkError`, `TimeoutError`, and `CorsError` had no stack trace, only their message.
- **License:** the `license` field in `package.json` said ISC. It now says MIT, matching `LICENSE.md`.

### Upgrading from 1.7.0

JavaScript code needs no changes. In TypeScript, the types now describe what the library actually returns, so some code may need updating:

- **A response is either a success or an error.** Check `res.isSuccess` (or `res.status`) to narrow `data` and `error`. An interrupt that changes a response must keep its fields consistent. To turn an error into a success, set `status: "success"`, `isSuccess: true`, `isError: false`, `error: null`, and `data`.
- **`res.status` is `"success"` or `"error"`.** Comparisons with `"idle"` or `"loading"` no longer compile.
- **`res.headers` is a `Headers` object.** Use `res.headers?.get("etag")`, not `res.headers["etag"]`.
- **Calling an instance returns `Promise<FetchfullyResponse<T>>`** instead of `Promise<any>`.
- **`create()` exists only on `Fetchfully` itself,** typed as `FetchfullyDefaultInstance`. Instances that `create()` returns never had it at runtime.
- **`FetchfullyInstance` has a new `cache` member,** so a hand-written mock typed as an instance needs one.

These type changes need no code changes:

- `res.refetch` is always present, so `res.refetch()` needs no `?.`.
- `body` accepts objects and arrays, which are sent as JSON. The new `RequestBody` type describes every accepted body.
- `Content-Type` and `Cache-Control` accept any string value.
- `FetchfullyDefaultInstance`, `RequestBody`, and the query and cache types are exported.

### Deprecated

- `isLoading` and `isIdle` on responses. An awaited response has always finished, so they're always `false` and `true`. Use `createQuery()` for live status. They'll be removed in 2.0.

### Not implemented yet

- The `whenSuccessful`, `whenFailed`, and `whenDone` options, and `res.cancel`, are in the types but have no effect yet. They're planned for a later release. Until then, use the awaited response, response interrupts, or a `signal`.
