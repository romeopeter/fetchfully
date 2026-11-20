# Fetchfully

<!-- <img src="./fetchfully.png" style="max-width:300px;display:block" /> -->

The Fetch API with a power pack ⚡️

Fetchfully is a small, typed layer over the standard Fetch API. It builds URLs, sends bodies, parses responses, and returns every outcome as a value, so requests never need `try/catch`. Live request status, deduplication, caching, retries, and interrupts are built in. It has no runtime dependencies.

```javascript
import { Fetchfully } from "fetchfully";

const api = Fetchfully.create({ baseURL: "https://api.example.com" });

const res = await api.get("/users", { page: 1 });

if (res.isSuccess) {
  console.log(res.data); // the parsed JSON
} else {
  console.error(res.error); // an HttpError, NetworkError, TimeoutError, …
}
```

## Contents

- [Features](#features)
- [Installation](#installation)
- [Quick start](#quick-start)
- [Key behaviours](#key-behaviours)
- [Making requests](#making-requests)
- [Responses](#responses)
- [Errors](#errors)
- [Timeouts, cancellation, and retries](#timeouts-cancellation-and-retries)
- [Refetching](#refetching)
- [Interrupts](#interrupts)
- [Live request status](#live-request-status)
- [Running requests together](#running-requests-together)
- [Deduplicating requests](#deduplicating-requests)
- [Caching](#caching)
- [Configuration reference](#configuration-reference)
- [API reference](#api-reference)
- [TypeScript](#typescript)
- [What Fetchfully doesn't do](#what-fetchfully-doesnt-do)
- [Development](#development)
- [License](#license)

---

## Features

- **Errors as values.** Every request resolves to a success or an error response. Check `isSuccess` instead of catching.
- **One config object.** Each request is described by a single object, with instance-wide and global defaults.
- **URL building.** Path segments and query objects, with a choice of array formats.
- **Bodies and parsing.** Objects are sent as JSON, and responses are parsed by their `Content-Type`.
- **Shortcut methods.** `get`, `post`, `put`, `patch`, and `delete`.
- **Timeouts, cancellation, and retries,** with a typed error class for each kind of failure.
- **Interrupts.** Change every request or response of an instance. Every handler can be removed.
- **Live status for any UI framework.** `createQuery()` is an observable that plugs into React, Vue, Svelte, Solid, and Angular.
- **Several requests at once.** `combineQueries()` gives several queries one status, and `dedupe` shares identical GET requests that are in flight together.
- **Caching.** An opt-in, per-instance cache with freshness, a size limit, and invalidation that refreshes the queries showing the changed data.
- **Typed.** Written in TypeScript, with every public type exported.

---

## Installation

```bash
npm install fetchfully
```

Fetchfully works wherever the standard Fetch API exists: modern browsers and Node.js 18 or later.

```javascript
// ES modules
import { Fetchfully } from "fetchfully";

// CommonJS
const { Fetchfully } = require("fetchfully");
```

`Http` is the same object under another name: `import { Http } from "fetchfully"`.

---

## Quick start

```javascript
import { Fetchfully, HttpError } from "fetchfully";

// 1. Create an instance for your API
const api = Fetchfully.create({
  baseURL: "https://api.example.com",
  headers: { Authorization: `Bearer ${token}` },
  timeout: 10_000,
});

// 2. Read
const users = await api.get("/users", { page: 2 });
// GET https://api.example.com/users?page=2

if (users.isSuccess) render(users.data);

// 3. Write
const created = await api.post("/users", { name: "Ada" });
// POST https://api.example.com/users with the JSON body {"name":"Ada"}

if (created.error instanceof HttpError && created.error.status === 409) {
  showMessage("That user already exists");
}
```

---

## Key behaviours

These rules cover most of what you need to use Fetchfully correctly.

1. **Requests resolve; they don't reject.** Every outcome is a response with `status: "success"` or `status: "error"`. Only programming errors reject the promise: setting both `baseURL` and `url`, or an interrupt that throws.
2. **Check before reading.** Test `res.isSuccess` (or `res.status`) first. On an error, `res.data` is `null` and `res.error` is an `Error`.
3. **Shortcut arguments:** `get(path, query?, options?)`, `post(path, body?, query?, options?)` (the same for `put` and `patch`), and `delete(path, query?, options?)`.
4. **Config merges from general to specific:** `Fetchfully.defaults`, then `Fetchfully.create(config)`, then the call's own config, then request interrupts. Objects such as `headers` and `cache` merge key by key, and other values are replaced. Header names match case-insensitively, and a header set to `undefined` isn't sent.
5. **Bodies:** objects and arrays are sent as JSON. Strings, `FormData`, `Blob`, binary data, and `URLSearchParams` are sent as they are.
6. **Responses are parsed by `Content-Type`:** JSON becomes a value, and text becomes a string. See [How the body is parsed](#how-the-body-is-parsed).
7. **Off by default:** retries, deduplication, and caching. Retries only cover network errors and timeouts. Deduplication and caching only apply to GET.
8. **Live status comes from `createQuery()`.** An awaited response has always finished. A query sends nothing until you call `run()`.

---

## Making requests

The examples in this section use an `api` instance:

```javascript
const api = Fetchfully.create({ baseURL: "https://api.example.com" });
```

### Calling an instance

Every instance, including `Fetchfully` itself, is a function that takes one config object:

```javascript
const res = await api({
  method: "PATCH",
  path: ["users", "42"],
  query: { notify: true },
  body: { status: "active" },
  headers: { "X-Request-Id": requestId },
});
// PATCH https://api.example.com/users/42?notify=true
```

The [Configuration reference](#configuration-reference) lists every option.

### Shortcut methods

| Method | Signature |
|---|---|
| GET | `api.get(path, query?, options?)` |
| POST | `api.post(path, body?, query?, options?)` |
| PUT | `api.put(path, body?, query?, options?)` |
| PATCH | `api.patch(path, body?, query?, options?)` |
| DELETE | `api.delete(path, query?, options?)` |

`options` accepts any config option except `path`, `method`, `query`, and `body`, which come from the other arguments.

```javascript
await api.get("/users", { active: true });
await api.post("/users", { name: "Ada" });
await api.put("/users/42", { name: "Ada Lovelace" });
await api.patch("/users/42", { status: "active" });
await api.delete("/users/42");

// Options go last. Pass undefined to skip the arguments before them.
await api.get("/users", undefined, { timeout: 3_000 });
await api.post("/reports", report, undefined, { retries: 2 });
```

### URLs

- `baseURL` is an instance's base URL, and `path` is joined onto it.
- `url` is a full URL for a single request. `path` is joined onto it too.
- Set one or the other. Setting both rejects the request, and that includes a `baseURL` set on `Fetchfully.defaults`.

```javascript
await api.get("/users/42/posts");               // https://api.example.com/users/42/posts
await api({ path: ["users", "42", "posts"] });  // the same URL

await Fetchfully({ url: "https://status.example.com/v1", path: "health" });
// https://status.example.com/v1/health
```

Slashes at the edges of path segments are trimmed, so `"/users"` and `"users"` give the same URL, and a trailing slash on `baseURL` never doubles up. A trailing slash at the end of a string path is kept (`"users/"` becomes `…/users/`), because some APIs treat the two differently.

### Query parameters

Pass an object as `query`, or as a shortcut's `query` argument. Values are URL-encoded, `null` and `undefined` values are skipped, and nested objects are sent as JSON.

`queryArrayFormat` decides how arrays are written. For `{ colors: ["red", "blue"] }`, before URL encoding:

| `queryArrayFormat` | Result |
|---|---|
| `"comma"` (default) | `colors=red,blue` |
| `"repeat"` | `colors=red&colors=blue` |
| `"brackets"` | `colors[]=red&colors[]=blue` |
| `"none"` | `colors=red blue` |

```javascript
await api.get("/posts", { page: 1, tags: ["js", "web"], author: null });
// https://api.example.com/posts?page=1&tags=js%2Cweb   (author is skipped)
```

### Request bodies

`body` (or a shortcut's `body` argument) is ignored for GET. For the other methods:

| Body | Sent as | `Content-Type` |
|---|---|---|
| Object or array | JSON | `application/json`, from the default headers |
| String | as is | `application/json`, from the default headers, unless you set another |
| `FormData` | as is | set by `fetch`, with the multipart boundary |
| `Blob` or `File` | as is | the blob's own type, unless you set another |
| `ArrayBuffer`, typed array, or Node `Buffer` | as is | none, unless you set one |
| `URLSearchParams` | as is | `application/x-www-form-urlencoded`, unless you set another |

For a body that isn't a string or a JSON value, Fetchfully leaves out its default `Content-Type: application/json` so that `fetch` can choose. On `FormData`, any `Content-Type` is left out, because only `fetch` knows the boundary.

```javascript
await api.post("/avatars", fileInput.files[0]); // sent with the file's own type

const form = new FormData();
form.append("title", "Q3 report");
form.append("file", file);
await api.post("/uploads", form);

await api.post("/import", csvText, undefined, {
  headers: { "Content-Type": "text/csv" },
});
```

### Headers and defaults

Every request starts with these default headers:

```http
Content-Type: application/json
Cache-Control: no-cache
```

Headers you pass are merged over them. Header names match case-insensitively, so `"content-type"` replaces the default `"Content-Type"`. This also applies to a header an interrupt sets.

To drop a header, set it to `undefined`. On an instance, that drops it for every request the instance sends.

```javascript
await api.get("/users", undefined, { headers: { "Cache-Control": undefined } }); // one call

const lean = Fetchfully.create({
  baseURL: "https://api.example.com",
  headers: { "Cache-Control": undefined }, // every request from this instance
});
```

**Cross-origin requests and preflights.** Browsers send a cross-origin request straight away only when its headers are on a short safe list. `Cache-Control` isn't on it, and neither is `Content-Type: application/json`. So with the default headers, every cross-origin request is preceded by an `OPTIONS` preflight request, and the server must allow both headers in `Access-Control-Allow-Headers`. If that extra round trip matters, set both to `undefined` on the instance. Requests that send JSON then need `Content-Type: application/json` on the call.

---

## Responses

### Response shape

| Field | Type | Meaning |
|---|---|---|
| `status` | `"success" \| "error"` | The outcome. |
| `isSuccess`, `isError` | `boolean` | Shorthand for the two statuses. |
| `data` | parsed body, or `null` | The parsed body on success. Always `null` on error. |
| `error` | `Error`, or `null` | One of the [error classes](#errors) on error. Always `null` on success. |
| `statusCode` | `number`, or `undefined` | The HTTP status. `undefined` when no response arrived. |
| `headers` | `Headers`, or `undefined` | The response headers, for example `res.headers?.get("etag")`. |
| `requestUrl` | `string` | The URL Fetchfully requested, after path and query building. |
| `refetch` | `(override?) => Promise<response>` | Sends the same request again. See [Refetching](#refetching). |

`isLoading` and `isIdle` are deprecated. On an awaited response they are always `false` and `true`. Use [`createQuery()`](#live-request-status) for live status. Both will be removed in 2.0.

### What counts as success

| Method | Succeeds when the status is |
|---|---|
| GET | any 2xx |
| POST, PUT, PATCH, DELETE | any 2xx, or 304 |

Any other status is an `HttpError`. `fetch` follows redirects before Fetchfully sees the response.

### How the body is parsed

Fetchfully reads the response's `Content-Type`:

| `Content-Type` | `data` is |
|---|---|
| `application/json` | the parsed JSON |
| `application/octet-stream` | an `ArrayBuffer` |
| `multipart/form-data` | a `FormData` |
| `image/*`, `video/*`, `audio/*` | a `Blob` |
| anything else, or none | a string |

A response labelled `application/json` needs a valid JSON body. An empty or invalid one gives an error response with a `SyntaxError`. A `204 No Content` without a `Content-Type` succeeds with `data: ""`.

### Narrowing in TypeScript

Checking `isSuccess` (or `status`) narrows the response:

```typescript
interface User {
  id: number;
  name: string;
}

const res = await api.get<User>("/users/1");

if (res.isSuccess) {
  res.data.name;     // User, not User | null
} else {
  res.error.message; // Error, not Error | null
}
```

---

## Errors

Failures come back on `res.error`. Each kind has its own class, exported for `instanceof` checks:

| Class | When | Retried with `retries` |
|---|---|---|
| `HttpError` | The server answered with a status that isn't a success. Has `status`, `statusText`, and `URL`, the final URL after redirects. | No |
| `NetworkError` | No response arrived: offline, DNS failure, connection refused. Browsers also report blocked cross-origin requests this way, because they don't tell scripts why a request failed. | Yes |
| `TimeoutError` | The `timeout` elapsed first. | Yes |
| `CancelError` | Your `signal` aborted the request. | No |
| `CorsError` | The runtime's error message says a cross-origin request was blocked. Browsers rarely say so, so expect `NetworkError` there. | No |

```javascript
import { HttpError, NetworkError, TimeoutError } from "fetchfully";

const res = await api.get("/users/42");

if (res.isError) {
  if (res.error instanceof HttpError && res.error.status === 404) showNotFound();
  else if (res.error instanceof NetworkError) showOffline();
  else if (res.error instanceof TimeoutError) showRetryButton();
}
```

- **Error bodies aren't read.** On an `HttpError`, `res.data` is `null`. Use `res.statusCode` and `res.headers`.
- **Invalid input is never sent.** A malformed URL or header comes back as the runtime's own `TypeError`, and no network request is made.
- **Other failures keep their own type,** such as the `SyntaxError` from a response labelled JSON that isn't.
- **Programming errors reject.** Setting both `baseURL` and `url`, or an interrupt that throws, rejects the promise with that error. A query's `run()` catches these too and puts them in `state.error`.

---

## Timeouts, cancellation, and retries

### Timeout

`timeout` aborts a request that takes longer than the given number of milliseconds, with a `TimeoutError`. The default, `0`, means no timeout. Each retry gets its own timeout.

```javascript
const res = await api.get("/reports", undefined, { timeout: 5_000 });

if (res.error instanceof TimeoutError) showRetryButton();
```

### Cancellation

Pass an `AbortSignal` as `signal`. Aborting it ends the request with a `CancelError`, and a signal that is already aborted sends nothing. One signal can be shared by many requests.

```javascript
const controller = new AbortController();
const pending = api.get("/search", { q: "ada" }, { signal: controller.signal });

controller.abort(); // for example, the user typed again

const res = await pending; // res.error is a CancelError
```

`timeout` and `signal` work together. Whichever fires first ends the request.

### Retries

`retries` is the number of extra attempts after a `NetworkError` or `TimeoutError`. `retryDelay` is the fixed wait between attempts, in milliseconds (default 1000). HTTP errors, cancellations, and invalid input are never retried.

```javascript
const api = Fetchfully.create({
  baseURL: "https://api.example.com",
  retries: 2,      // up to 3 attempts in total
  retryDelay: 500,
});
```

---

## Refetching

Every response has `refetch()`, which sends the same request again. An override replaces the options you give for that run. It replaces whole top-level keys, so a new `query` replaces the old one instead of merging with it.

```javascript
const page1 = await api.get("/users", { page: 1, limit: 20 });

const again = await page1.refetch();                               // the same request
const page2 = await page1.refetch({ query: { page: 2, limit: 20 } });
```

With caching on, `refetch()` always goes to the network and updates the cached response.

---

## Interrupts

Interrupts run on every request or response of one instance, in the order they were added. Each `use()` returns a function that removes the handler. A new instance from `Fetchfully.create()` starts with no interrupts.

### Request interrupts

A request interrupt receives the merged config and returns the config to send. It can be async.

```javascript
const eject = api.interrupts.request.use(async (config) => {
  config.headers["Authorization"] = `Bearer ${await getToken()}`;
  return config;
});

eject(); // removes the handler
```

### Response interrupts

`use(onFulfilled?, onRejected?)` takes two optional handlers. `onFulfilled` receives success responses and `onRejected` receives error responses. Each returns the response to pass on, which can be a different one. They run for every response, including ones served from the cache.

```javascript
api.interrupts.response.use(
  (response) => response,
  (response) => {
    if (response.statusCode === 401) redirectToLogin();
    return response;
  },
);
```

### Removing handlers in React

```jsx
useEffect(() => {
  const eject = api.interrupts.request.use((config) => {
    config.headers["Authorization"] = `Bearer ${token}`;
    return config;
  });

  return eject; // removes the handler on unmount, or when the token changes
}, [token]);
```

---

## Live request status

`createQuery(fetcher, config?)` wraps a request in a small observable that reports its state as it changes, from `idle` to `loading` to `success` or `error`. It has no framework dependency: it exposes `subscribe` and `getSnapshot`, which every major UI framework can consume.

```javascript
import { createQuery } from "fetchfully";

const users = createQuery(api, { path: "/users" });

const unsubscribe = users.subscribe((state) => render(state));

await users.run();                       // sends the request
await users.run({ query: { page: 2 } }); // overrides config for this run
users.abort();                           // cancels; state.error is a CancelError
```

| `state.status` | Meaning | `state.data` | `state.error` |
|---|---|---|---|
| `"idle"` | `run()` hasn't been called yet | `null` | `null` |
| `"loading"` | a request is in flight | the previous data, or `null` | `null` |
| `"success"` | the latest request succeeded | the new data | `null` |
| `"error"` | the latest request failed | the previous data, or `null` | the `Error` |

Each state also has `isIdle`, `isLoading`, `isSuccess`, and `isError`.

- **Nothing runs on creation.** Call `run()` when the request should go out. This keeps server rendering and conditional fetching in your hands.
- **The newest run wins.** Calling `run()` while a request is in flight aborts the older one and drops its result.
- **`run()` never rejects.** It resolves with the final state. Failures, including programming errors, end up in `state.error`.
- **Overrides are shallow.** `run(override)` merges `override` over the query's config, replacing whole top-level keys.
- **`subscribe()` calls the listener straight away** with the current state, then on every change. It returns an unsubscribe function.
- **Snapshots are stable.** `getSnapshot()` returns the same object until the state changes.
- **One query, many subscribers.** Create a query once, for example at module level, and subscribe to it from as many components as you like. They all share one state, and at most one request is in flight.
- **It refreshes after invalidation.** While it has subscribers, a query runs again when `api.cache.invalidate()` matches its last request. See [Invalidation](#invalidation).

### React

```jsx
import { useEffect, useState, useSyncExternalStore } from "react";

function Users() {
  // Create the query once per component, not on every render
  const [users] = useState(() => createQuery(api, { path: "/users" }));
  const state = useSyncExternalStore(users.subscribe, users.getSnapshot, users.getSnapshot);

  useEffect(() => {
    users.run();
    return () => users.abort();
  }, [users]);

  if (state.isError) return <p>{state.error.message}</p>;
  if (!state.data) return <p>Loading…</p>;
  return <UserList users={state.data} />;
}
```

### Svelte

A query already satisfies Svelte's store contract, so `$` works directly:

```svelte
<script>
  const users = createQuery(api, { path: "/users" });
  users.run();
</script>

{#if $users.isLoading}Loading…{:else if $users.isError}{$users.error.message}{/if}
```

### Vue

```javascript
import { shallowRef, onScopeDispose } from "vue";

const users = createQuery(api, { path: "/users" });
const state = shallowRef(users.getSnapshot());

onScopeDispose(users.subscribe((s) => (state.value = s)));
onScopeDispose(() => users.abort());
users.run();
```

### Solid

```javascript
import { from } from "solid-js";

const state = from(users); // state()?.isLoading
```

### Angular

```typescript
const state = signal(users.getSnapshot());
inject(DestroyRef).onDestroy(users.subscribe((s) => state.set(s)));
users.run();
```

---

## Running requests together

Responses never reject, so `Promise.all` waits for every request instead of stopping at the first failure:

```javascript
const [users, posts] = await Promise.all([api.get("/users"), api.get("/posts")]);

if (users.isError) showError(users.error);
```

For live status across several requests, combine queries into a group. A group has the same `subscribe`, `getSnapshot`, `run`, and `abort` as a single query, so every framework recipe above works unchanged.

```javascript
import { createQuery, combineQueries } from "fetchfully";

const users = createQuery(api, { path: "/users" });
const posts = createQuery(api, { path: "/posts" });
const page = combineQueries([users, posts]);

page.subscribe((state) => {
  state.status; // combined: "idle" | "loading" | "success" | "error"
  state.data;   // [usersData, postsData]; both set when status is "success"
  state.error;  // the first failure, if any
  state.errors; // each query's error, or null
  state.states; // each query's own state
});

await page.run(); // runs both in parallel; never rejects
page.abort();     // cancels both
```

The combined status is `loading` if any query is in flight. Otherwise it is `error` if any query failed, `success` if all succeeded, and `idle` if some query hasn't run yet. Groups take existing queries, so a query shared across components can also belong to a group. In TypeScript, `combineQueries([users, posts])` infers the data as a tuple, such as `[User[], Post[]]`.

---

## Deduplicating requests

With `dedupe` on, identical GET requests that are in flight at the same time share one network call. Identical means the same URL, query, headers, credentials, and mode.

```javascript
const api = Fetchfully.create({ baseURL: "https://api.example.com", dedupe: true });

// Three components ask for the current user at once: one request
const [a, b, c] = await Promise.all([api.get("/me"), api.get("/me"), api.get("/me")]);
```

`dedupe` is off by default. It can be set on `Fetchfully.defaults`, on an instance, or on one call (`api.get("/me", undefined, { dedupe: true })`).

- **Each caller stays independent.** Every caller gets its own response object, runs the response interrupts, and keeps its own `timeout` and `signal`. A caller that cancels leaves on its own. The network request is aborted only once every caller has cancelled.
- **The data is shared.** Callers receive the same parsed `data` object, so treat it as read-only.
- **It's not a cache.** Requests that don't overlap in time each go to the network. For that, see [Caching](#caching), which deduplicates as well.
- **GET only.** Other methods are never deduplicated.

---

## Caching

Each instance has its own in-memory response cache. Turn it on with `cache`, and successful GET responses are served from memory while they're fresh.

```javascript
const api = Fetchfully.create({
  baseURL: "https://api.example.com",
  cache: { staleTime: 30_000 }, // serve stored responses for 30 seconds
});

await api.get("/users"); // from the network, then stored
await api.get("/users"); // from the cache, with no request
```

| Option | Meaning |
|---|---|
| `staleTime` | How long, in milliseconds, a stored response is served without a request. `0` always goes to the network but still stores the result. `Infinity` keeps it until it's invalidated. |
| `maxEntries` | The most responses kept per instance (default 100). The least recently used goes first. Set it on the instance. |

Like `dedupe`, `cache` can be set on `Fetchfully.defaults`, on an instance, or on one call. Caching also shares requests that are in flight, so you don't need `dedupe` as well.

```javascript
await api.get("/users", undefined, { cache: false });                // skip the cache for this call
await api.get("/users", undefined, { cache: { staleTime: 5_000 } }); // stricter freshness for this call

const res = await api.get("/users");
await res.refetch();                               // always a fresh request; updates the cache
await usersQuery.run({ cache: { staleTime: 0 } }); // the same, for a query
```

### Invalidation

After a change on the server, invalidate what it affected. A path matches itself and everything below it:

```javascript
await api.post("/users", newUser);
api.cache.invalidate("/users"); // users, users/42, users?page=2, but not users-admin

api.cache.invalidate("https://other.example.com/feed"); // a full URL
api.cache.invalidate((url) => url.includes("/admin/")); // or any rule
api.cache.clear();                                      // everything
```

Queries showing invalidated data refresh themselves. Any `createQuery()` (or `combineQueries()` group) that has subscribers, and whose last request matches, runs again with its last options. Queries without subscribers are left alone. This works with caching off too, so `invalidate()` doubles as a "this data changed" signal:

```javascript
const users = createQuery(api, { path: "/users" });
users.subscribe(render);
await users.run();

await api.post("/users", newUser);
api.cache.invalidate("/users"); // `users` reloads; subscribers see loading, then success
```

Invalidation matches against each response's `requestUrl`.

### Good to know

- **GET only, successes only.** Errors and other methods are never stored.
- **The data is shared.** Every caller served from the cache gets the same `data` object, so treat it as read-only.
- **Headers are part of the key.** A different `Authorization` header makes a different entry, so one user's responses aren't served to another.
- **Invalidation wins over requests in flight.** A request that started before an `invalidate()` still returns its result to its callers, but the result isn't stored, and later requests don't join it.
- **On a server, use one instance per incoming request.** A cache on a long-lived shared instance would be shared by every user of the server.
- **It's not the browser's HTTP cache.** This is Fetchfully's own memory cache, and `Cache-Control` headers don't affect it.

---

## Configuration reference

| Option | Type | Default | Description |
|---|---|---|---|
| `baseURL` | `string` | none | Base URL that `path` is joined onto. Can't be combined with `url`. |
| `url` | `string` | none | Full URL for one request. Can't be combined with `baseURL`. |
| `path` | `string \| string[]` | none | Path joined onto `baseURL` or `url`. |
| `query` | `Record<string, any>` | none | Query parameters. `null` and `undefined` values are skipped. |
| `queryArrayFormat` | `"comma" \| "repeat" \| "brackets" \| "none"` | `"comma"` | How arrays in `query` are written. |
| `method` | `"GET" \| "POST" \| "PUT" \| "PATCH" \| "DELETE"` | `"GET"` | The HTTP method. |
| `body` | `RequestBody` | none | The request body, ignored for GET. See [Request bodies](#request-bodies). |
| `headers` | `RequestHeaders` | `Content-Type: application/json`, `Cache-Control: no-cache` | Request headers, merged over the defaults. |
| `credentials` | `"same-origin" \| "omit" \| "include"` | `"same-origin"` | Whether cookies are sent, as in `fetch`. |
| `mode` | `"cors" \| "same-origin" \| "no-cors"` | `"cors"` | The cross-origin mode, as in `fetch`. |
| `keepalive` | `boolean` | `false` | Lets the request outlive the page, as in `fetch`. |
| `timeout` | `number` (ms) | `0` (none) | Aborts each attempt after this long, with a `TimeoutError`. |
| `signal` | `AbortSignal` | none | Cancels the request, with a `CancelError`. |
| `retries` | `number` | `0` | Extra attempts after a `NetworkError` or `TimeoutError`. |
| `retryDelay` | `number` (ms) | `1000` | The fixed wait between attempts. |
| `dedupe` | `boolean` | `false` | Shares one network call between identical GET requests in flight. |
| `cache` | `{ staleTime, maxEntries? } \| false` | off | The per-instance response cache, for GET. See [Caching](#caching). |

Config can be set at four levels. Each one merges over the one before it.

```javascript
// 1. Global: the default instance, and instances created after this line
Fetchfully.defaults.timeout = 5_000;

// 2. Instance
const api = Fetchfully.create({ baseURL: "https://api.example.com", retries: 1 });
api.defaults.timeout = 8_000; // changes this instance's config for later requests

// 3. One call
await api.get("/exports", undefined, { timeout: 30_000 });

// 4. A request interrupt, which sees the merged config last
api.interrupts.request.use((config) => ({ ...config, timeout: config.timeout * 2 }));
```

`Fetchfully.create()` copies `Fetchfully.defaults` when it runs, so set global defaults before creating instances.

---

## API reference

### Exports

```javascript
import {
  Fetchfully,     // the default instance
  Http,           // the same object as Fetchfully
  createQuery,    // a request with live status
  combineQueries, // several queries as one
  HttpError,
  NetworkError,
  TimeoutError,
  CancelError,
  CorsError,
} from "fetchfully";
```

### Instances

`Fetchfully`, and every instance from `Fetchfully.create()`, has these members:

| Member | Description |
|---|---|
| `instance(config)` | Sends a request and resolves to a response. |
| `instance.get`, `.post`, `.put`, `.patch`, `.delete` | Shortcut methods. See [Shortcut methods](#shortcut-methods). |
| `instance.defaults` | The instance's config. Changes apply to later requests. |
| `instance.interrupts.request.use(handler)` | Adds a request interrupt and returns a function that removes it. |
| `instance.interrupts.response.use(onFulfilled?, onRejected?)` | Adds a response interrupt and returns a function that removes it. |
| `instance.cache.invalidate(target)` | Drops matching cached responses and re-runs matching subscribed queries. `target` is a path, a full URL, or `(requestUrl) => boolean`. |
| `instance.cache.clear()` | Drops every cached response and re-runs every subscribed query. |
| `instance.cache.onInvalidate(listener)` | Calls `listener(matches)` on every invalidation, where `matches(requestUrl)` returns a boolean. Returns an unsubscribe function. |

`Fetchfully.create(config?)` creates a new instance with its own config, interrupts, and cache. It exists only on `Fetchfully` itself, not on the instances it creates.

### `createQuery(fetcher, config?)`

`fetcher` is an instance, or any function with the same call signature. Without a `cache` property, a plain function works but never re-runs after an invalidation. `createQuery()` returns a query:

| Member | Description |
|---|---|
| `getSnapshot()` | The current state. The same object is returned until the state changes. |
| `subscribe(listener)` | Calls `listener(state)` straight away, then on every change. Returns an unsubscribe function. |
| `run(override?)` | Sends the request with `override` merged over the config. Aborts any request already in flight. Resolves with the final state and never rejects. |
| `abort(reason?)` | Aborts the request in flight, if any. The state becomes an error with a `CancelError`. |

### `combineQueries(queries)`

Takes an array of queries and returns a group with the same members as a query. Its `run()` takes no override and runs every query in parallel. Its state also has `data` as a tuple, `errors`, and `states`. See [Running requests together](#running-requests-together).

---

## TypeScript

Every request method and `createQuery()` takes a type for the response data:

```typescript
import { Fetchfully, createQuery, combineQueries, type FetchfullyResponse } from "fetchfully";

interface User { id: number; name: string }
interface Post { id: number; title: string }

const api = Fetchfully.create({ baseURL: "https://api.example.com" });

const res: FetchfullyResponse<User[]> = await api.get<User[]>("/users");

const users = createQuery<User[]>(api, { path: "/users" });
const posts = createQuery<Post[]>(api, { path: "/posts" });
const page = combineQueries([users, posts]); // data: [User[], Post[]]
```

The type isn't checked at runtime: `get<User>()` trusts the server to send a `User`.

These types are exported: `FetchfullyConfig`, `FetchfullyInstance` (an instance from `create()`), `FetchfullyDefaultInstance` (`Fetchfully` itself, which also has `create()`), `FetchfullyResponse`, `FetchfullySuccessResponse`, `FetchfullyErrorResponse`, `RequestOptions`, `RequestBody`, `RequestHeaders`, `RequestStatus`, `Query`, `QueryState`, `QueryListener`, `QueryFetcher`, `QueryGroup`, `QueryGroupState`, `QueryGroupData`, `QueryGroupListener`, `CacheOptions`, `FetchfullyCache`, and `InvalidateTarget`.

---

## What Fetchfully doesn't do

- **Refresh on focus or reconnect.** Nothing runs on its own. Call `query.run()` or `api.cache.invalidate()` from your own listener:

  ```javascript
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") api.cache.invalidate("/users");
  });
  ```

- **Optimistic updates.** Query state is read-only, and there's no way to set data locally.
- **Read error bodies.** On an `HttpError`, `data` is `null`.
- **Retry HTTP errors, or back off.** Retries cover network errors and timeouts only, with a fixed delay.
- **Report upload or download progress.**
- **Stream request bodies.** `ReadableStream` bodies aren't supported.
- **Persist or share the cache.** The cache lives in memory, in one instance.

---

## Development

```bash
npm install
npm run build             # writes dist/fetchfully.mjs, dist/fetchfully.cjs, and dist/index.d.ts
node test/core.smoke.mjs  # run one test file
```

The tests run against `dist`, so build first. `test/core`, `test/query`, `test/multi`, and `test/cache` (each `*.smoke.mjs`) use a mocked `fetch` and run offline. `test/interrupts.smoke.mjs` and `test/test-smoke.mjs` call live APIs and need a network connection.

`npm publish` runs the build first (`prepublishOnly`), so a release always ships a fresh `dist`. Each release's changes are listed in [CHANGELOG.md](CHANGELOG.md).

Report bugs at [github.com/romeopeter/fetchfully/issues](https://github.com/romeopeter/fetchfully/issues).

---

## License

MIT. See [LICENSE.md](LICENSE.md).
