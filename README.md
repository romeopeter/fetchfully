# Fetchfully

<!-- <img src="./fetchfully.png" style="max-width:300px;display:block" /> -->

<br />

**Fetchfully** wraps the JavaScript Fetch API with additional functionalities for simplicity and efficiency. It's the JavaScript Fetch API with Power Pack ⚡️

---

## Features

- **Object-first data fetching**: Supply all request config as an object for clarity.
- **Automatic response parsing**: Handles responses based on Content-Type automatically.
- **Parses JSON payload**: Serializes mutation request bodies as JSON.
- **Simple path and query parameters**: Pass path and query parameters as object values. Tweak query array formatting in config.
- **Global config and instances**: Create independent instances that share a global config or override it with instance-specific config.
- **Consumable request methods**: Ergonomic shortcuts for common HTTP requests.
- **Errors as values**: Every response settles to success or error; narrow on `isSuccess` instead of wrapping calls in `try/catch`.
- **Live request status**: `createQuery()` tracks idle, loading, success, and error as an observable that plugs into React, Vue, Svelte, Solid, or Angular.
- **Multiple requests**: `combineQueries()` gives several queries one combined status, and opt-in `dedupe` shares a single network call between identical GETs in flight at the same time.
- **Caching**: An opt-in, per-instance response cache with freshness, size limits, and path-based invalidation that refreshes the queries showing the changed data.
- **Refetch**: Re-run a request without reconstructing its config.
- **Interrupts**: Register request and response interrupt handlers per instance, with eject support.
- **Fully typed**: Written in TypeScript with all necessary types exported.

---

## Installation

```bash
npm install fetchfully
```

## Imports

```javascript
import { Fetchfully } from "fetchfully";
// or
import { Http } from "fetchfully"; // Http is an alias for Fetchfully
```

---

## How To Use

_NOTE: The API endpoints below are for demonstration purposes only. Test on live endpoints for expected results._

### Basic request

```javascript
import { Fetchfully } from "fetchfully";

await Fetchfully({ url: "https://api.example.com/posts" });
```

### With path segments

```javascript
// String path
await Fetchfully({
  url: "https://api.example.com",
  path: "posts/1/comments",
});
// URL: https://api.example.com/posts/1/comments

// Array of path segments
await Fetchfully({
  url: "https://api.example.com",
  path: ["posts", "1", "comments"],
});
// URL: https://api.example.com/posts/1/comments
```

### With query parameters

```javascript
const query = {
  page: 1,
  limit: 10,
  colors: ["red", "blue"],
  size: "large",
};

await Fetchfully({
  url: "https://api.example.com/posts",
  query,
  queryArrayFormat: "comma",
});
// URL: https://api.example.com/posts?page=1&limit=10&colors=red,blue&size=large
```

---

## Mutation Requests (POST, PUT, PATCH, DELETE)

```javascript
// POST
await Fetchfully({
  url: "https://api.example.com/posts",
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: { title: "foo", body: "bar", userId: 1 },
});

// PUT
await Fetchfully({
  url: "https://api.example.com/posts/1",
  method: "PUT",
  headers: { Authorization: "Bearer token", "Content-Type": "application/json" },
  body: { id: 1, title: "foo", body: "bar", userId: 1 },
});

// PATCH
await Fetchfully({
  url: "https://api.example.com/posts/1",
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: { title: "bar" },
});

// DELETE
await Fetchfully({ url: "https://api.example.com/posts/1", method: "DELETE" });
```

An object or array `body` is sent as JSON. A string is sent as it is, and so is anything `fetch` can send natively: `FormData`, `Blob`, `ArrayBuffer`, a typed array (such as a Node `Buffer`), or `URLSearchParams`. For those, Fetchfully drops its default `Content-Type: application/json` so `fetch` can set the right one: the `FormData` boundary, the `Blob`'s own type, or form encoding. Any other `Content-Type` you set is kept, except on `FormData`, where only `fetch` knows the boundary.

```javascript
await Fetchfully.post("/avatars", fileInput.files[0]); // sent with the file's own type
await Fetchfully.post("/uploads", bytes, undefined, {
  headers: { "Content-Type": "application/octet-stream" },
});
```

---

## Configuration Options

| Option             | Type                                          | Description                                        |
| ------------------ | --------------------------------------------- | -------------------------------------------------- |
| `baseURL`          | `string`                                      | Base URL for all requests.                         |
| `url`              | `string`                                      | Full URL for a single request (mutually exclusive with `baseURL`). |
| `path`             | `string \| string[]`                          | URL path segments appended to `baseURL`.           |
| `query`            | `Record<string, any>`                         | URL query parameters.                              |
| `method`           | `"GET" \| "POST" \| "PUT" \| "PATCH" \| "DELETE"` | HTTP method. Defaults to `"GET"`.             |
| `body`             | `string \| FormData \| Blob \| ArrayBuffer`   | Request payload.                                   |
| `headers`          | `RequestHeaders`                              | Request headers.                                   |
| `credentials`      | `"same-origin" \| "omit" \| "include"`        | Request credentials.                               |
| `keepalive`        | `boolean`                                     | Keep connection alive after page unload.           |
| `mode`             | `"same-origin" \| "cors" \| "no-cors"`        | CORS mode.                                         |
| `timeout`          | `number`                                      | Milliseconds before the request is aborted.        |
| `queryArrayFormat` | `"brackets" \| "comma" \| "repeat" \| "none"` | How array query params are serialized.             |

---

## Instances

Create independent instances with their own config using `Fetchfully.create()`.

```javascript
import { Fetchfully } from "fetchfully";

const authAPI = Fetchfully.create({
  baseURL: "https://api.example.com/auth",
  timeout: 5000,
});

const userAPI = Fetchfully.create({
  baseURL: "https://api.example.com/users",
  headers: { "Cache-Control": "no-cache" },
});

const analyticsAPI = Fetchfully.create({
  baseURL: "https://api.example.com/analytics",
  timeout: 10000,
});
```

---

## Global Defaults

Set defaults that apply to all requests on the default instance.

```javascript
import { Fetchfully } from "fetchfully";

Fetchfully.defaults.baseURL = "https://api.example.com";
Fetchfully.defaults.timeout = 5000;
```

Instance-specific config always takes precedence over global defaults.

```javascript
const customAPI = Fetchfully.create({
  headers: { Authorization: "Bearer token" },
  timeout: 2500, // overrides the global 5000ms for this instance only
});

await customAPI({ path: "users", query: { active: true } });
// https://api.example.com/users?active=true
```

---

## Consumable Methods

Ergonomic shortcuts for common HTTP requests. Requires `baseURL` to be set.

```javascript
import { Fetchfully } from "fetchfully";

Fetchfully.defaults.baseURL = "https://api.example.com";

// GET
await Fetchfully.get("/users");
await Fetchfully.get("/users", { active: true }); // with query params

// POST
await Fetchfully.post("/users", { name: "John", email: "john@example.com" });

// PUT
await Fetchfully.put("/users/123", { name: "John Doe" });

// PATCH
await Fetchfully.patch("/users/123", { status: "active" });

// DELETE
await Fetchfully.delete("/users/123");
```

Every shortcut takes an optional last argument for per-call options: anything in the config except `path`, `method`, `query`, and `body`, which come from the other arguments.

```javascript
const controller = new AbortController();

await Fetchfully.get("/users", { active: true }, { signal: controller.signal });
await Fetchfully.post("/users", newUser, undefined, { timeout: 3000, retries: 2 });
await Fetchfully.delete("/users/123", undefined, { headers: { "X-Reason": "cleanup" } });
```

---

## Errors

Errors are returned on `res.error`, never thrown. Each failure type has its own exported class:

| Class | When |
|---|---|
| `HttpError` | The server answered with a non-success status. Has `status`, `statusText`, and `URL`. |
| `NetworkError` | The request never got a response (offline, DNS failure). Browsers also report a blocked cross-origin request this way, because they don't tell scripts why a request failed. |
| `CorsError` | The runtime's error says a cross-origin request was blocked. Browsers rarely do, so expect `NetworkError` there. |
| `TimeoutError` | The `timeout` elapsed first. |
| `CancelError` | Your `signal` aborted the request. |

Invalid input, such as a malformed URL or header, is never sent. It comes back as the runtime's own `TypeError`, and `retries` doesn't retry it.

```javascript
import { Fetchfully, HttpError, TimeoutError } from "fetchfully";

const res = await Fetchfully.get("/users/123");

if (res.error instanceof HttpError && res.error.status === 404) showNotFound();
else if (res.error instanceof TimeoutError) showRetryButton();
```

---

## Timeout

Abort a request automatically after a given number of milliseconds.

```javascript
const fetcher = Fetchfully.create({
  baseURL: "https://api.example.com",
  timeout: 5000, // 5 seconds
});

const res = await fetcher.get("/users");
if (res.error instanceof TimeoutError) {
  console.error("Request timed out");
}
```

---

## Refetch

Re-run a request with the same config, or override specific fields.

```javascript
const fetcher = Fetchfully.create({ baseURL: "https://api.example.com" });
const response = await fetcher.get("/users");

if (response.isSuccess) {
  // Re-run with the exact same config
  const fresh = await response.refetch();
  console.log("Updated users:", fresh.data);

  // Or override fields for this run (shallow-merged over the original config)
  const nextPage = await response.refetch({ query: { page: 2 } });
}
```

---

## Interrupts

Register handlers that run before every request or after every response. Each `use()` call returns an eject function for cleanup.

### Request interrupt

Runs before the request fires. Use it to inject headers, add tracing, or modify the config.

```javascript
const fetcher = Fetchfully.create({ baseURL: "https://api.example.com" });

const eject = fetcher.interrupts.request.use((config) => {
  config.headers["Authorization"] = `Bearer ${getToken()}`;
  return config;
});

// Remove the handler when no longer needed
eject();
```

### Response interrupt

Runs after every response. `onFulfilled` receives successful responses, `onRejected` receives error responses.

```javascript
fetcher.interrupts.response.use(
  (response) => {
    // transform or log successful responses
    return response;
  },
  (response) => {
    // handle errors globally
    if (response.statusCode === 401) redirectToLogin();
    return response;
  }
);
```

### Eject in React

```javascript
useEffect(() => {
  const eject = fetcher.interrupts.request.use((config) => {
    config.headers["Authorization"] = `Bearer ${token}`;
    return config;
  });
  return eject; // removes the handler on unmount
}, [token]);
```

---

## Responses

An awaited response has always finished, so it is either a success or an error. Errors are returned, not thrown.

```javascript
const res = await fetcher.get("/users");

res.status     // "success" | "error"
res.isSuccess  // true on a successful response
res.isError    // true on any error (network, timeout, cancel, HTTP error)
res.statusCode // HTTP status code (e.g. 404)
res.data       // response data, or null on error
res.error      // Error instance, or null on success
```

In TypeScript, checking `isSuccess` (or `status`) narrows the response:

```typescript
const res = await fetcher<User>({ path: "users/1" });

if (res.isSuccess) {
  res.data.name;     // User, not User | null
} else {
  res.error.message; // Error, not Error | null
}
```

> `res.isLoading` and `res.isIdle` are deprecated. On an awaited response they are always `false` and `true`. Use `createQuery()` below for live status. They will be removed in 2.0.

---

## Live Request Status

`createQuery()` wraps a request in a small observable that reports `idle → loading → success | error` as it happens. It has no framework dependency: it exposes `subscribe` and `getSnapshot`, the shape every major UI framework already knows how to consume.

```javascript
import { Fetchfully, createQuery } from "fetchfully";

const users = createQuery(Fetchfully, { path: "users" });

users.subscribe((state) => {
  state.status    // "idle" | "loading" | "success" | "error"
  state.isLoading // true while a request is in flight
  state.data      // latest data; kept from the previous run while reloading
  state.error     // Error instance in the error state, otherwise null
});

await users.run();                         // nothing is sent until run()
await users.run({ query: { page: 2 } });   // override config for this run
users.abort();                             // cancel; state.error is a CancelError
```

- **Nothing runs on creation.** Call `run()` when you want the request to go out (this keeps server rendering and conditional fetching in your hands).
- **The newest run wins.** Calling `run()` while a request is in flight aborts the older one, and its result is dropped.
- **`run()` never rejects.** Failures, including thrown config errors, end up in `state.error`.
- **One query, many subscribers.** Create a query once (for example at module level) and subscribe to it from as many components as you like. They all share one state, and only one request is ever in flight. Each `run()` sends a request unless the instance has [caching](#caching) turned on.

### React

```jsx
import { useEffect, useState, useSyncExternalStore } from "react";

function Users() {
  // Create the query once per component, not on every render
  const [users] = useState(() => createQuery(Fetchfully, { path: "users" }));
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
  const users = createQuery(Fetchfully, { path: "users" });
  users.run();
</script>

{#if $users.isLoading}Loading…{:else if $users.isError}{$users.error.message}{/if}
```

### Vue

```javascript
import { shallowRef, onScopeDispose } from "vue";

const users = createQuery(Fetchfully, { path: "users" });
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

## Running Requests Together

Responses never reject, so `Promise.all` waits for every request and never short-circuits on the first failure:

```javascript
const [users, posts] = await Promise.all([
  Fetchfully.get("/users"),
  Fetchfully.get("/posts"),
]);

if (users.isError) showError(users.error);
```

For live status across several requests, combine queries into a group. A group has the same `subscribe` / `getSnapshot` / `run` / `abort` contract as a single query, so every framework recipe above works unchanged.

```javascript
import { Fetchfully, createQuery, combineQueries } from "fetchfully";

const users = createQuery(Fetchfully, { path: "users" });
const posts = createQuery(Fetchfully, { path: "posts" });
const page = combineQueries([users, posts]);

page.subscribe((state) => {
  state.status  // combined: "idle" | "loading" | "success" | "error"
  state.data    // [usersData, postsData]; both non-null when status is "success"
  state.error   // the first failure, if any
  state.errors  // each query's error, or null
  state.states  // each query's own snapshot
});

await page.run(); // runs both in parallel; never rejects
page.abort();     // cancels both
```

The combined status is `loading` if any query is in flight, otherwise `error` if any failed, `success` if all succeeded, and `idle` if some query hasn't run yet. Groups take existing queries, so a query shared across components can also be part of a group. In TypeScript, `combineQueries([users, posts])` infers the data tuple, e.g. `[User[], Post[]]`.

---

## Deduplicating Requests

Turn on `dedupe` and identical GET requests that are in flight at the same time share one network call. "Identical" means the same URL, query, headers, credentials, and mode.

```javascript
const api = Fetchfully.create({ baseURL: "https://api.example.com", dedupe: true });

// Three components ask for the current user at once → one request
const [a, b, c] = await Promise.all([api.get("/me"), api.get("/me"), api.get("/me")]);
```

Set it on `Fetchfully.defaults`, on an instance, or per call (`get("/me", undefined, { dedupe: true })`). It's off by default.

- **Each caller stays independent.** Every caller gets its own response object, runs the response interrupts, and keeps its own `timeout` and `signal`. A caller that cancels leaves alone; the network request is only aborted once every caller has cancelled.
- **The data is shared.** Callers receive the same parsed `data` object, so treat it as read-only.
- **It is not a cache.** Requests that don't overlap in time each go to the network. For that, see [Caching](#caching), which includes deduplication.
- **GET only.** Mutations are never deduplicated.

---

## Caching

Each instance has its own in-memory response cache. Turn it on with `cache`, and successful GET responses are served from memory while they're fresh.

```javascript
const api = Fetchfully.create({
  baseURL: "https://api.example.com",
  cache: { staleTime: 30_000 }, // serve stored responses for 30 seconds
});

await api.get("/users"); // network, then stored
await api.get("/users"); // from the cache, no request
```

| Option | Meaning |
|---|---|
| `staleTime` | How long (ms) a stored response is served without a request. `0` always goes to the network but still stores the result; `Infinity` keeps it until invalidated. |
| `maxEntries` | Most responses kept per instance (default 100). The least recently used goes first. Set it on the instance. |

Like `dedupe`, `cache` can be set on `Fetchfully.defaults`, an instance, or a single call. Caching also shares in-flight requests, so you don't need `dedupe` as well.

```javascript
await api.get("/users", undefined, { cache: false });                 // skip the cache for this call
await api.get("/users", undefined, { cache: { staleTime: 5_000 } });  // stricter freshness for this call

const res = await api.get("/users");
await res.refetch();                                // always a fresh request; updates the cache
await usersQuery.run({ cache: { staleTime: 0 } }); // same for a query
```

### Invalidation

After a change on the server, invalidate what it affected. A path matches itself and everything below it:

```javascript
await api.post("/users", newUser);
api.cache.invalidate("/users"); // users, users/42, users?page=2, but not users-admin

api.cache.invalidate("https://other.example.com/feed"); // a full URL
api.cache.invalidate((url) => url.includes("/admin/"));  // or any rule
api.cache.clear();                                       // everything
```

Queries showing invalidated data refresh themselves. Any `createQuery` (or `combineQueries` group) that is currently subscribed and whose last request matches runs again with its last options. Unsubscribed queries are left alone. This works even with caching off, so `invalidate` doubles as a "this data changed" signal:

```javascript
const users = createQuery(api, { path: "users" });
users.subscribe(render);
await users.run();

await api.post("/users", newUser);
api.cache.invalidate("/users"); // `users` reloads; subscribers see loading → success
```

Each response also has `requestUrl`, the URL Fetchfully requested, which is what invalidation matches against.

### Good to know

- **GET only, successes only.** Errors and mutations are never stored.
- **Shared data.** Every caller served from the cache gets the same `data` object, so treat it as read-only.
- **Headers are part of the key.** A different `Authorization` header is a different entry, so one user's responses aren't served to another.
- **Invalidation wins over requests already in flight.** A request that started before an `invalidate` still returns its result to its callers, but isn't stored, and later requests don't join it.
- **On servers, use one instance per incoming request.** A cache on a long-lived shared instance would be shared by every user of the server.
- **Not the browser's HTTP cache.** This is Fetchfully's own memory cache. `Cache-Control` headers don't affect it.

---

## License

This project is licensed under the MIT License.
