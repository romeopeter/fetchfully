/**
 * Smoke tests for URL building, shortcut-method options, and error exports
 *
 * Run: npm run build && node test/core.smoke.mjs
 *
 * Uses a mocked global fetch, so no network access is needed.
 */

import { getEventListeners } from "node:events";
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
// Caller signal listeners
// ---------------------------------------------------------------

await run("12. A long-lived signal keeps no listeners once requests finish", async () => {
  const controller = new AbortController();
  const { signal } = controller;
  const listeners = () => getEventListeners(signal, "abort").length;

  reset();
  for (let i = 0; i < 5; i++) await api.get("users", undefined, { signal });
  assert(listeners() === 0, `5 successes leave 0 listeners (got ${listeners()})`);

  reset(() => new Response("missing", { status: 404 }));
  await api.get("users", undefined, { signal });
  assert(listeners() === 0, `HTTP error leaves 0 listeners (got ${listeners()})`);

  reset(() => {
    throw new TypeError("fetch failed");
  });
  await api.get("users", undefined, { signal, retries: 2, retryDelay: 1 });
  assert(calls.length === 3, `retried twice (${calls.length} calls)`);
  assert(listeners() === 0, `3 failed attempts leave 0 listeners (got ${listeners()})`);

  reset(never);
  const timedOut = await api.get("users", undefined, { signal, timeout: 10 });
  assert(timedOut.error instanceof TimeoutError, "timeout still reported");
  assert(listeners() === 0, `timeout leaves 0 listeners (got ${listeners()})`);

  reset();
  await Promise.all([
    api.get("users", undefined, { signal, dedupe: true }),
    api.get("users", undefined, { signal, dedupe: true }),
  ]);
  assert(calls.length === 1, `deduped GETs share one call (${calls.length})`);
  assert(listeners() === 0, `deduped GETs leave 0 listeners (got ${listeners()})`);
});

await run("13. Cancelling through the signal still works", async () => {
  const controller = new AbortController();

  reset(never);
  const pending = api.get("users", undefined, { signal: controller.signal });
  controller.abort();
  const res = await pending;

  assert(res.error instanceof CancelError, "abort mid-flight → CancelError");

  reset();
  const late = await api.get("users", undefined, { signal: controller.signal });
  assert(late.error instanceof CancelError, "already-aborted signal → CancelError");
  assert(calls.length === 0, `no network call for an aborted signal (${calls.length})`);
});

// ---------------------------------------------------------------
// Network failures across runtimes
// ---------------------------------------------------------------

// The TypeError message each runtime's fetch() rejects with when the network fails
const NETWORK_MESSAGES = {
  Node: "fetch failed",
  Chrome: "Failed to fetch",
  Firefox: "NetworkError when attempting to fetch resource.",
  Safari: "Load failed",
};

await run("14. Every runtime's network failure is a retried NetworkError", async () => {
  for (const [runtime, message] of Object.entries(NETWORK_MESSAGES)) {
    reset(() => {
      throw new TypeError(message);
    });
    const res = await api.get("users", undefined, { retries: 2, retryDelay: 1 });

    assert(res.error instanceof NetworkError, `${runtime}: "${message}" → NetworkError`);
    assert(calls.length === 3, `${runtime}: retried twice (${calls.length} calls)`);
  }
});

await run("15. A failure that names CORS is a CorsError, never retried", async () => {
  reset(() => {
    throw new TypeError("Request blocked by CORS policy");
  });
  const res = await api.get("users", undefined, { retries: 2, retryDelay: 1 });

  assert(res.error instanceof CorsError, "CORS message → CorsError");
  assert(calls.length === 1, `not retried (${calls.length} call)`);
});

await run("16. Invalid input stays a TypeError and never reaches the network", async () => {
  reset();
  const badHeader = await api.get("users", undefined, {
    headers: { "X-Bad": "line\nbreak" },
    retries: 2,
    retryDelay: 1,
  });
  assert(badHeader.error instanceof TypeError, `bad header → TypeError (got ${badHeader.error?.name})`);
  assert(!(badHeader.error instanceof NetworkError), "bad header is not a NetworkError");
  assert(calls.length === 0, `bad header: no network call (${calls.length})`);

  // Node has no page to resolve a relative URL against
  const relative = await Fetchfully.create({}).get("users", undefined, { retries: 2, retryDelay: 1 });
  assert(relative.error instanceof TypeError, `relative URL in Node → TypeError (got ${relative.error?.name})`);
  assert(calls.length === 0, `relative URL: no network call (${calls.length})`);

  const circular = {};
  circular.self = circular;
  const unserializable = await api.post("users", circular);
  assert(unserializable.isError, "a body JSON.stringify can't handle is an error value, not a rejection");
});

await run("17. Without a global Request (fetch-only mocks), failures still classify", async () => {
  const SavedRequest = globalThis.Request;
  delete globalThis.Request;

  try {
    assert(typeof globalThis.Request === "undefined", "Request removed for this test");

    reset();
    const ok = await api.get("users");
    assert(ok.isSuccess, "requests still succeed");

    reset(() => {
      throw new TypeError(NETWORK_MESSAGES.Chrome);
    });
    const offline = await api.get("users", undefined, { retries: 1, retryDelay: 1 });
    assert(offline.error instanceof NetworkError, "Chrome failure → NetworkError");
    assert(calls.length === 2, `retried once (${calls.length} calls)`);
  } finally {
    globalThis.Request = SavedRequest;
  }
});

// ---------------------------------------------------------------
// Request bodies
// ---------------------------------------------------------------

// What the server would receive for a recorded call
const received = async (call = calls[0]) => {
  const request = new Request(call.url, call.init);
  return { type: request.headers.get("content-type"), text: await request.text() };
};

await run("18. Bodies fetch can send natively go as they are, with fetch's Content-Type", async () => {
  const bytes = () => new TextEncoder().encode("raw-bytes");

  reset();
  await api.post("upload", new Blob(["png-bytes"], { type: "image/png" }));
  let got = await received();
  assert(got.text === "png-bytes", `Blob bytes sent (got ${JSON.stringify(got.text)})`);
  assert(got.type === "image/png", `Blob's own type used (got ${got.type})`);

  reset();
  await api.post("upload", bytes().buffer);
  got = await received();
  assert(got.text === "raw-bytes", `ArrayBuffer bytes sent (got ${JSON.stringify(got.text)})`);
  assert(got.type === null, `no JSON Content-Type on an ArrayBuffer (got ${got.type})`);

  reset();
  await api.post("upload", bytes());
  got = await received();
  assert(got.text === "raw-bytes", `Uint8Array bytes sent (got ${JSON.stringify(got.text.slice(0, 30))})`);

  reset();
  await api.post("login", new URLSearchParams({ user: "ada" }));
  got = await received();
  assert(got.text === "user=ada", `URLSearchParams sent encoded (got ${JSON.stringify(got.text)})`);
  assert(
    got.type?.startsWith("application/x-www-form-urlencoded"),
    `form-encoded Content-Type (got ${got.type})`
  );

  const form = new FormData();
  form.append("name", "ada");
  reset();
  await api.post("profile", form);
  got = await received();
  assert(got.type?.startsWith("multipart/form-data; boundary="), `FormData gets a boundary (got ${got.type})`);
  assert(got.text.includes('name="name"') && got.text.includes("ada"), "FormData fields sent");
});

await run("19. Objects become JSON; strings and JSON keep application/json", async () => {
  reset();
  await api.post("users", { name: "ada" });
  let got = await received();
  assert(got.text === '{"name":"ada"}', `object sent as JSON (got ${got.text})`);
  assert(got.type === "application/json", `JSON Content-Type kept (got ${got.type})`);

  reset();
  await api.post("users", '{"name":"ada"}');
  got = await received();
  assert(got.text === '{"name":"ada"}', "string sent as is");
  assert(got.type === "application/json", `string keeps the JSON Content-Type (got ${got.type})`);
});

await run("20. A Content-Type you set is kept, except on FormData", async () => {
  reset();
  await api.post("upload", new TextEncoder().encode("raw").buffer, undefined, {
    headers: { "content-type": "application/octet-stream" },
  });
  let got = await received();
  assert(
    got.type === "application/octet-stream",
    `lowercase header wins over the JSON default, not merged with it (got ${got.type})`
  );

  const form = new FormData();
  form.append("name", "ada");
  reset();
  await api.post("profile", form, undefined, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  got = await received();
  assert(got.type?.includes("boundary="), `FormData's boundary still set (got ${got.type})`);
});

await run("21. A binary body is sent again on retry", async () => {
  let attempt = 0;
  reset(() => {
    attempt++;
    if (attempt === 1) throw new TypeError("Failed to fetch");
    return new Response("ok", { status: 200 });
  });

  const res = await api.post("upload", new Blob(["png-bytes"], { type: "image/png" }), undefined, {
    retries: 1,
    retryDelay: 1,
  });
  const got = await received(calls[1]);

  assert(res.isSuccess && calls.length === 2, `succeeded on the retry (${calls.length} calls)`);
  assert(got.text === "png-bytes", `retry carries the same bytes (got ${JSON.stringify(got.text)})`);
});

// ---------------------------------------------------------------
// Summary
// ---------------------------------------------------------------

console.log("\n===================================");
console.log(`  Results: ${passed} passed, ${failed} failed`);
console.log("===================================\n");

process.exit(failed > 0 ? 1 : 0);
