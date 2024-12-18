# Simple Fetch

<img src="./SimpleFetch.png" style="max-width:300px;display:block" />

<br />

**Simple Fetch** is an object-first promise-based HTTP client for the browser . It wraps the JavaScript Fetch API with additional functionalities for efficiency and readability. Just supply the objects and that's it!

---

## Features

- **Object-First Data Fetching**: Pass data directly as objects, improving code clarity.
- **In-Built Base Request Logic**: Automatically handles responses based on content type.
- **Parses Payload**: Automatically parses mutation request payload as JSON
- **Simple headers**: Simplifies working with request headers.
- **Simple Path and Query Parameters**: Automatically constructs and encode URL. Just supply the path and query values.
- **Customizable Settings**: Set timeouts and parameter delimiters for your specific needs.

---

## Installation

Install the package using npm or yarn:

```bash
npm install simple-fetch

# or

yarn add simple-fetch
```

## How To Use

### Basic request

```javascript
import fetcher from "simple-fetch";

// 1. Original
await fetcher({ url: "https://api.example.com/posts" });

/** 2. With path strings
 *
 *  URL results in: https://api.example.com/posts/1/commments
 */
await fetcher({
  url: "https://api.example.com",
  path: "/posts1/comments",
});

/** 3. With array of path segments
 *
 * URL results in: https://api.example.com/posts/1/commments
 */
await fetcher({
  url: "https://api.example.com",
  path: ["posts", "1", "comments"],
});

/**
 * 4. With query parameters
 *
 * URL results in: https://api.example.com/comments?page=1&limit=10&colors=red,blue&size=large
 */
const query = {
  page: 1,
  limit: 10,
  colors: ["red", "blue"],
  size: "large",
};
const queryArrayFormat = "comma";
await fetch({
  url: "https://api.example.com",
  query,
  customOption: { queryArrayFormat },
});
```

### Mutation request (POST, PUT, PATCH and DELETE)

```javascript
/**
 * 1. POST request
 *
 */
await fetch({
  url: "https://api.example.com/post",
  method: "POST",
  headers: {
    contentType: "json",
  },
  body: {
    title: "foo",
    body: "bar",
    userId: 1,
  },
});

/**
 * 2. PUT request
 *
 */
await fetch({
  url: "https://api.example.com/post",
  method: "PUT",
  headers: {
    contentType: "json",
  },
  body: {
    id: 1,
    title: "foo",
    body: "bar",
    userId: 1,
  },
});

/**
 * 3. PATCH request
 *
 */
await fetch({
  url: "https://api.example.com/post/1",
  method: "PATCH",
  headers: {
    contentType: "json",
  },
  body: {
    title: "bar",
  },
});

/**
 * 4. Delete request
 *
 */
await fetch({ url: "https://api.example.com/post/1", method: "DELETE" });
```

## Configuration

When initializing `SimpleFetch`, you can pass the following options:

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

### Custom options

| Option                      | Type                                                                  | Description                                        |
| --------------------------- | --------------------------------------------------------------------- | -------------------------------------------------- |
| `responseType`              | `"text" \| "json" \| "formData" \| "blob" \| "arrayBuffer" \| "body"` | Request response type. Default is `json`.          |
| `timeout`                   | `number`                                                              | Time as milliseconds before terminating request.   |
| `queryParamsArrayFormatter` | `"brackets" \| "comma" \| "repeat" \| "none"`                         | Indicates how parameter array should be formatted. |

Example:

```javascript

// Set request timeout and response type
const options = {
    responseType: 'text',
    timeout: 5000, // 5 seconds
    queryArrayFormat: "brackets"
}

const fetch await fetcher({
    url: "https://jsonplaceholder.typicode.com/posts",
    ...,
    ...,
    customOptions: options
})
```

## License

This project is licensed under the MIT License... for now!
