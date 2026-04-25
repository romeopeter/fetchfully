/**
 * Smoke test for Fetchfully
 *
 * Run: npm run build && node test-smoke.mjs
 *
 * Tests core features against jsonplaceholder.typicode.com.
 * Each test prints PASS/FAIL with a short description.
 */

import { Fetchfully, Http } from "../dist/fetchfully.mjs";

const BASE = "https://jsonplaceholder.typicode.com";

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
// Tests
// ---------------------------------------------------------------

await run("1. Basic GET request", async () => {
  const fetcher = Fetchfully.create({ baseURL: BASE });
  const res = await fetcher.get("/posts/1");

  assert(res.isSuccess === true, "isSuccess is true");
  assert(res.isError === false, "isError is false");
  assert(res.status === "success", 'status is "success"');
  assert(res.data !== null, "data is not null");
  assert(res.data?.id === 1, "data.id is 1");
  assert(res.error === null, "error is null");
});

await run("2. GET with query params", async () => {
  const fetcher = Fetchfully.create({ baseURL: BASE });
  const res = await fetcher.get("/posts", { userId: 1 });

  assert(res.isSuccess === true, "isSuccess is true");
  assert(Array.isArray(res.data), "data is an array");
  assert(res.data?.length > 0, "returned results");
  assert(res.data?.every((p) => p.userId === 1), "all posts belong to userId 1");
});

await run("3. GET with path params (string)", async () => {
  // NOTE: When baseURL is set, the engine ignores `url` and builds from baseURL + path.
  // So we pass the full path segment instead.
  const fetcher = Fetchfully.create({ baseURL: BASE });
  const res = await fetcher({
    method: "GET",
    path: "/posts/2",
  });

  assert(res.isSuccess === true, "isSuccess is true");
  assert(res.data?.id === 2, "data.id is 2");
});

await run("4. GET with path params (array)", async () => {
  // Same as test 3: with baseURL set, pass the full path segments.
  const fetcher = Fetchfully.create({ baseURL: BASE });
  const res = await fetcher({
    method: "GET",
    path: ["posts", "1", "comments"],
  });

  assert(res.isSuccess === true, "isSuccess is true");
  assert(Array.isArray(res.data), "data is an array of comments");
  assert(res.data?.length > 0, "returned comments");
});

await run("5. POST request", async () => {
  const fetcher = Fetchfully.create({
    baseURL: BASE,
    headers: { "Content-Type": "application/json" },
  });
  const res = await fetcher.post("/posts", {
    title: "test",
    body: "smoke test",
    userId: 1,
  });

  assert(res.isSuccess === true, "isSuccess is true");
  assert(res.data?.id !== undefined, "server returned an id");
  assert(res.data?.title === "test", "title matches");
});

await run("6. PUT request", async () => {
  const fetcher = Fetchfully.create({
    baseURL: BASE,
    headers: { "Content-Type": "application/json" },
  });
  const res = await fetcher.put("/posts/1", {
    id: 1,
    title: "updated",
    body: "updated body",
    userId: 1,
  });

  assert(res.isSuccess === true, "isSuccess is true");
  assert(res.data?.title === "updated", "title was updated");
});

await run("7. PATCH request", async () => {
  const fetcher = Fetchfully.create({
    baseURL: BASE,
    headers: { "Content-Type": "application/json" },
  });
  const res = await fetcher.patch("/posts/1", { title: "patched" });

  assert(res.isSuccess === true, "isSuccess is true");
  assert(res.data?.title === "patched", "title was patched");
});

await run("8. DELETE request", async () => {
  const fetcher = Fetchfully.create({ baseURL: BASE });
  const res = await fetcher.delete("/posts/1");

  assert(res.isSuccess === true, "isSuccess is true");
});

await run("9. Error handling — 404", async () => {
  const fetcher = Fetchfully.create({ baseURL: BASE });
  const res = await fetcher.get("/invalid-endpoint-that-does-not-exist");

  assert(res.isError === true, "isError is true");
  assert(res.isSuccess === false, "isSuccess is false");
  assert(res.error !== null, "error is present");
  assert(res.error?.name === "HttpError", "error is HttpError");
  assert(res.data === null, "data is null on error");
  assert(res.statusCode === 404, "statusCode is 404");
  assert(typeof res.refetch === "function", "refetch still available on error");
});

await run("10. Timeout error", async () => {
  const fetcher = Fetchfully.create({ baseURL: BASE, timeout: 1 });
  const res = await fetcher.get("/posts");

  assert(res.isError === true, "isError is true");
  assert(res.error?.name === "TimeoutError", "error is TimeoutError");
});

await run("11. Refetch", async () => {
  const fetcher = Fetchfully.create({ baseURL: BASE });
  const res = await fetcher.get("/posts/1");

  assert(typeof res.refetch === "function", "refetch is a function");

  const res2 = await res.refetch();
  assert(res2.isSuccess === true, "refetch succeeded");
  assert(res2.data?.id === 1, "refetch returned same data");
});

await run("12. Instance config (create)", async () => {
  const api = Fetchfully.create({
    baseURL: BASE,
    headers: { "X-Custom-Header": "smoke-test" },
  });

  const res = await api.get("/posts/1");
  assert(res.isSuccess === true, "custom instance works");
  assert(res.data?.id === 1, "data is correct");
});

await run("13. Dual export — Http alias", async () => {
  assert(Http !== undefined, "Http export exists");
  assert(typeof Http.create === "function", "Http.create is a function");
  assert(Http === Fetchfully, "Http and Fetchfully are the same object");
});

await run("14. Query array formats", async () => {
  const fetcher = Fetchfully.create({ baseURL: BASE });

  // brackets format
  const res = await fetcher({
    method: "GET",
    path: "/posts",
    query: { userId: [1, 2] },
    queryArrayFormat: "brackets",
  });
  assert(res.isSuccess === true, "brackets format works");

  // comma format
  const res2 = await fetcher({
    method: "GET",
    path: "/posts",
    query: { userId: [1, 2] },
    queryArrayFormat: "comma",
  });
  assert(res2.isSuccess === true, "comma format works");

  // repeat format
  const res3 = await fetcher({
    method: "GET",
    path: "/posts",
    query: { userId: [1, 2] },
    queryArrayFormat: "repeat",
  });
  assert(res3.isSuccess === true, "repeat format works");
});

await run("15. baseURL + url conflict throws", async () => {
  const fetcher = Fetchfully.create();

  let caught = false;
  let message = "";
  try {
    await fetcher({ baseURL: BASE, url: "/posts", method: "GET" });
  } catch (err) {
    caught = true;
    message = err.message;
  }

  assert(caught === true, "throws when both baseURL and url are set");
  assert(message.includes("cannot set both"), "error message is descriptive");
});

await run("16. Response shape", async () => {
  const fetcher = Fetchfully.create({ baseURL: BASE });
  const res = await fetcher.get("/posts/1");

  assert("data" in res, "has data");
  assert("error" in res, "has error");
  assert("status" in res, "has status");
  assert("isIdle" in res, "has isIdle");
  assert("isLoading" in res, "has isLoading");
  assert("isSuccess" in res, "has isSuccess");
  assert("isError" in res, "has isError");
  assert("refetch" in res, "has refetch");
});

// ---------------------------------------------------------------
// Summary
// ---------------------------------------------------------------

console.log("\n===================================");
console.log(`  Results: ${passed} passed, ${failed} failed`);
console.log("===================================\n");

process.exit(failed > 0 ? 1 : 0);
