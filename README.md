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
- **Request status**: Monitor loading, success, and error states on every response.
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

---

## Timeout

Abort a request automatically after a given number of milliseconds.

```javascript
const fetcher = Fetchfully.create({
  baseURL: "https://api.example.com",
  timeout: 5000, // 5 seconds
});

const res = await fetcher.get("/users");
if (res.isError && res.error.name === "TimeoutError") {
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

## Request Status

Every response includes status indicators for easy conditional rendering.

```javascript
const res = await fetcher.get("/users");

res.isIdle     // true when no request is in flight
res.isLoading  // true while the request is pending
res.isSuccess  // true on a successful response
res.isError    // true on any error (network, timeout, HTTP error)
res.status     // "idle" | "loading" | "success" | "error"
res.statusCode // HTTP status code (e.g. 404)
res.data       // response data, or null on error
res.error      // Error instance, or null on success
```

---

## License

This project is licensed under the MIT License.
