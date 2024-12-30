# Fetchfully

<!-- <img src="./SimpleFetch.png" style="max-width:300px;display:block" /> -->

<br />

Javascript Fetch API with Power Pack ⚡️ <br/> **Fetchfully** wraps the JavaScript Fetch API with additional functionalities for ease and efficiency.

---

## Features
- **In-Built Base Request Logic**: Automatically handles responses based on content type.
- **Parses Payload**: Automatically parses mutation request payload as JSON
- **Simple headers**: Simplifies working with request headers.
- **Simple Path and Query Parameters**: Automatically constructs and encode URL. Just supply the path and query values.
- **Customizable Settings**: Set timeouts and query parameter delimiters for your specific needs.
- **Global config and Instances**: Create different instances that use a global config or override it with instance-specific config.
- **Object-First Data Fetching**: Supply all init config as object, improving code clarity.

---

## Installation

Install the package using npm or yarn:

```bash
npm install fetchfully

# or

yarn add fetchfully
```

## How To Use

### Basic request with default instance

##### 1. Normal request

```javascript
import fetcher from "fetch-plus";

await fetcher({ url: "https://api.example.com/posts" });
```

##### 2. With path string

```javascript
await fetcher({
  url: "https://api.example.com",
  path: "/posts1/comments",
});

// URL results in: https://api.example.com/posts/1/commments
```

##### 3. With array of path segments

```javascript
await fetcher({
  url: "https://api.example.com",
  path: ["posts", "1", "comments"],
});

// URL results in: https://api.example.com/posts/1/commments
```

##### 4. With query parameters

```javascript
const query = {
  page: 1,
  limit: 10,
  colors: ["red", "blue"],
  size: "large",
};

await fetcher({
  url: "https://api.example.com",
  query,
  queryArrayFormat = "comma",
});

// URL results in: https://api.example.com/comments?page=1&limit=10&colors=red,blue&size=large
```

### Mutation request (POST, PUT, PATCH and DELETE)

##### 1. POST request

```javascript
await fetcher({
  url: "https://api.example.com/post",
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: {
    title: "foo",
    body: "bar",
    userId: 1,
  },
});
```

##### 2. PUT request

```javascript
await fetcher({
  url: "https://api.example.com/post",
  method: "PUT",
  headers: {
    "Authorization": "Bearer token",
    "Content-Type": "application/json",
  },
  body: {
    id: 1,
    title: "foo",
    body: "bar",
    userId: 1,
  }
});
```

##### 3. PATCH request

```javascript
await fetcher({
  url: "https://api.example.com/post/1",
  method: "PATCH",
  headers: {
    "Content-Type": "application/json",
  },
  body: {title: "bar"}
});
```

##### 4. Delete request

```javascript
await fetcher({ url: "https://api.example.com/post/1", method: "DELETE" });
```

## Fetchfully Configuration

When initializing `Fetchfully`, you can pass the following options:

### Base options

| Option          | Type                                   | Description                                                |
| --------------- | -------------------------------------- | ---------------------------------------------------------- |
| `baseUrl`       | `String`                               | Base URL for all requests.                                 |
| `path`          | `string \| string[] \| undefined`      | URL path segments.                                         |
| `query`         | `string \| string[] \| undefined`      | URL query parameters.                                      |
| `method`        | `string`                               | Request action method.                                     |
| `body`          | `string \| undefined`                  | Request payload.                                           |
| `credentials`   | `"same-origin" \| "omit" \| "include"` | Request credentials.                                       |
| `keepalive`     | `boolean`                              | Persist requests request connection.                       |
| `mode`          | `"same-origin" \| "cors" \| "no-cors"` | Request CORS mode.                                         |
| `customOptions` | `CustomOptionsType`                    | Request options not explicitly available in the Fetch API. |
| `timeout`       | `number`                               | Time as milliseconds before terminating request.   |
| `queryArrayFormat` | `"brackets" \| "comma" \| "repeat" \| "none"` | Indicates how parameter array should be formatted. |


## Fetchfully Instance

Create new instance of Fetchfully with independent custom configurations with the `fetcher.create()` factory method.

```javascript
import fetcher from "fetchfully";

// api/auth
const authAPI = fetchfully.create({
  baseUrl: "https://api.example.com/auth",
  timeout: 5000,
});

// api/users
const userAPI = fetcher.create({
  baseURL: "https://api.example.com/user",
  headers: {
    "Cache-Control": "no-cache",
  },
});

// api/analytics
const analyticsAPI = fetcher.create({
  baseURL: "https://api.example.com/analytics",
  timeout: 5000
});
```

## Fetchfully Default Config

Create a global config that will persist across all requests

##### Global default

```javascript
import fetcher from "fetchfully";

fetcher.defaults.baseUrl = "https://api.example.com";
fetcher.defaults.timeout = 5000;
```

##### Custom Instance Default

```javascript
const customAPI = fetcher.create({
  headers: {
    Authorization: "Bearer token", // Instance-specific authorization header
  },
  timeout: 2500, // Instance-specific base URL overridden by global config base URL.
});

// Use custom instance
// URL results in: 'https://api.example.com/users?active=true
await customAPI({
  path: "/users",
  query: { active: true },
});
```
Configs made in a created instance take precedence over those in global default config. For instance, the `2500` (2.5 seconds) set above is specific to that instance and overrides the global default timeout (if/when set).

## License

This project is licensed under the MIT.
