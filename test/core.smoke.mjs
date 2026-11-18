/**
 * Smoke tests for URL building, shortcut-method options, and error exports
 *
 * Run: npm run build && node test/core.smoke.mjs
 *
 * Uses a mocked global fetch, so no network access is needed.
 */

import {
  Fetchfully,
  NetworkError,
  HttpError,
  CorsError,
  TimeoutError,
  CancelError,
} from "../dist/fetchfully.mjs";

const BASE = "https://api.test";

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    console.log(`  PASS  ${label}`);
    passed++;
  } else {
    console.log(`  FAIL  ${label}`);
    failed++;
  }
}

async function run(name, fn) {
  console.log(`\n--- ${name} ---`);
  try {
    await fn();
  } catch (err) {
    console.log(`  FAIL  threw unexpectedly: ${err.message}`);
    failed++;
  }
}

// ---------------------------------------------------------------
// Mock fetch: records each call; behaviour picked per test
// ---------------------------------------------------------------

let calls = [];
let respond = () => new Response("ok", { status: 200 });

globalThis.fetch = (input, init = {}) => {
  calls.push({ url: String(input), init });

  return new Promise((resolve, reject) => {
    const abort = () =>
      reject(new DOMException("The operation was aborted.", "AbortError"));
    if (init.signal?.aborted) return abort();
    init.signal?.addEventListener("abort", abort);

    Promise.resolve()
      .then(() => respond(String(input), init))
      .then(resolve, reject);
  });
};

const reset = (handler) => {
  calls = [];
  respond = handler ?? (() => new Response("ok", { status: 200 }));
};
const never = () => new Promise(() => {}); // hangs until aborted
const lastUrl = () => calls.at(-1)?.url;

const api = Fetchfully.create({ baseURL: BASE });

// ---------------------------------------------------------------
// URL building
// ---------------------------------------------------------------

await run("1. Leading slash in a string path does not double up", async () => {
  reset();
  await api.get("/users");
  assert(lastUrl() === `${BASE}/users`, `"/users" → ${lastUrl()}`);

  await api.get("users");
  assert(lastUrl() === `${BASE}/users`, `"users" → ${lastUrl()}`);

  await api.get("//users/1");
  assert(lastUrl() === `${BASE}/users/1`, `"//users/1" → ${lastUrl()}`);
});

await run("2. Trailing slash on a string path is kept", async () => {
  reset();
  await api.get("users/");
  assert(lastUrl() === `${BASE}/users/`, `"users/" → ${lastUrl()}`);
});

await run("3. Array path segments are joined with single slashes", async () => {
  reset();
  await api({ method: "GET", path: ["/users/", "/1", "posts"] });
  assert(lastUrl() === `${BASE}/users/1/posts`, `→ ${lastUrl()}`);
});

await run("4. Base URL with a trailing slash plus a leading-slash path", async () => {
  reset();
  const slashed = Fetchfully.create({ baseURL: `${BASE}/v1/` });
  await slashed.get("/users");
  assert(lastUrl() === `${BASE}/v1/users`, `→ ${lastUrl()}`);
});

await run("5. Null / undefined query values are skipped, not fatal", async () => {
  reset();
  await api.get("users", { page: 2, filter: null, sort: undefined, q: "a" });
  assert(lastUrl() === `${BASE}/users?page=2&q=a`, `→ ${lastUrl()}`);
});

// ---------------------------------------------------------------
// Shortcut-method options
// ---------------------------------------------------------------

await run("6. get(path, query, { signal }) cancels with CancelError", async () => {
  reset(never);
  const controller = new AbortController();
  const pending = api.get("users", undefined, { signal: controller.signal });
  controller.abort();
  const res = await pending;

  assert(res.isError === true, "isError is true");
  assert(res.error instanceof CancelError, `error is CancelError (got ${res.error?.name})`);
});

await run("7. post(path, data, query, { signal }) forwards the signal", async () => {
  reset(never);
  const controller = new AbortController();
  const pending = api.post("users", { a: 1 }, undefined, { signal: controller.signal });
  controller.abort();
  const res = await pending;

  assert(res.error instanceof CancelError, `error is CancelError (got ${res.error?.name})`);
});

await run("8. Options carry headers and timeout", async () => {
  reset();
  await api.get("users", undefined, { headers: { "X-Trace": "abc" } });
  assert(calls[0].init.headers["X-Trace"] === "abc", "custom header sent");

  reset(never);
  const res = await api.delete("users/1", undefined, { timeout: 20 });
  assert(res.error instanceof TimeoutError, `timeout → TimeoutError (got ${res.error?.name})`);
});

await run("9. Positional args win over options", async () => {
  reset();
  // `method` and `path` are not part of RequestOptions; plain JS callers could still pass them
  await api.get("users", undefined, { method: "DELETE", path: "nope" });

  assert(calls[0].init.method === "GET", `method stays GET (got ${calls[0].init.method})`);
  assert(lastUrl() === `${BASE}/users`, `path stays "users" (got ${lastUrl()})`);
});

// ---------------------------------------------------------------
// Exported error classes
// ---------------------------------------------------------------

await run("10. Error classes are exported and match instanceof", async () => {
  reset(() => new Response("missing", { status: 404, statusText: "Not Found" }));
  const notFound = await api.get("users/999");

  assert(notFound.error instanceof HttpError, "404 → instanceof HttpError");
  assert(notFound.error.status === 404, `HttpError.status is 404 (got ${notFound.error.status})`);
  assert(notFound.error.statusText === "Not Found", "HttpError.statusText readable");

  reset(() => {
    throw new TypeError("fetch failed");
  });
  const offline = await api.get("users");
  assert(offline.error instanceof NetworkError, "fetch failed → instanceof NetworkError");

  assert(typeof CorsError === "function", "CorsError exported");
});

await run("11. Error stack traces are not empty", async () => {
  reset(() => {
    throw new TypeError("fetch failed");
  });
  const res = await api.get("users");
  const lines = res.error.stack.split("\n").length;

  assert(lines > 1, `NetworkError stack has frames (${lines} lines)`);
});

// ---------------------------------------------------------------
// Summary
// ---------------------------------------------------------------

console.log("\n===================================");
console.log(`  Results: ${passed} passed, ${failed} failed`);
console.log("===================================\n");

process.exit(failed > 0 ? 1 : 0);
