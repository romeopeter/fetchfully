/**
 * Smoke tests for settled responses, refetch overrides, and createQuery()
 *
 * Run: npm run build && node test/query.smoke.mjs
 *
 * Uses a mocked global fetch, so no network access is needed.
 */

import { Fetchfully, createQuery } from "../dist/fetchfully.mjs";

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
// Mock fetch: routes by pathname, honours AbortSignal, records calls
// ---------------------------------------------------------------

const calls = [];
const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const routes = {
  "/users": (url) => json({ page: Number(url.searchParams.get("page") ?? 1) }),
  "/boom": () => json({ message: "nope" }, 500),
  "/partial": () => json({ partial: true }, 206),
  "/redirect": () => new Response(null, { status: 302 }),
};

globalThis.fetch = (input, init = {}) => {
  const url = new URL(input);
  calls.push(url);
  const delay = Number(url.searchParams.get("delay") ?? 0);

  return new Promise((resolve, reject) => {
    const abort = () =>
      reject(new DOMException("The operation was aborted.", "AbortError"));
    if (init.signal?.aborted) return abort();

    const timer = setTimeout(() => resolve(routes[url.pathname](url)), delay);
    init.signal?.addEventListener("abort", () => {
      clearTimeout(timer);
      abort();
    });
  });
};

const tick = (ms = 0) => new Promise((resolve) => setTimeout(resolve, ms));
const api = Fetchfully.create({ baseURL: BASE });

// ---------------------------------------------------------------
// Settled responses (promise API)
// ---------------------------------------------------------------

await run("1. Awaited response reports only settled state", async () => {
  const res = await api.get("users");

  assert(res.status === "success", 'status is "success"');
  assert(res.isSuccess === true && res.isError === false, "isSuccess / isError");
  assert(res.isLoading === false, "deprecated isLoading is false");
  assert(res.isIdle === true, "deprecated isIdle is true");
});

await run("2. refetch(override) applies the override", async () => {
  const res = await api({ method: "GET", path: "users", query: { page: 1 } });
  const again = await res.refetch({ query: { page: 7 } });

  assert(res.data.page === 1, "original request used page 1");
  assert(again.data.page === 7, "refetch override sent page 7");
  assert(typeof again.refetch === "function", "refetched response can refetch again");
});

await run("3. Mutation with an unlisted 2xx is a success (was stuck on 'loading')", async () => {
  const res = await api.post("partial", { a: 1 });

  assert(res.status === "success", `206 is success (got "${res.status}")`);
  assert(res.data?.partial === true, "206 body parsed");
});

await run("4. Mutation with a non-304 3xx is an error (was stuck on 'loading')", async () => {
  const res = await api.post("redirect", { a: 1 });

  assert(res.status === "error", `302 is error (got "${res.status}")`);
  assert(res.error?.name === "HttpError", "error is HttpError");
});

// ---------------------------------------------------------------
// createQuery()
// ---------------------------------------------------------------

await run("5. Starts idle with a stable snapshot, nothing sent", async () => {
  const before = calls.length;
  const q = createQuery(api, { method: "GET", path: "users" });

  assert(q.getSnapshot().status === "idle", 'status is "idle"');
  assert(q.getSnapshot().isIdle === true, "isIdle is true");
  assert(q.getSnapshot() === q.getSnapshot(), "snapshot keeps identity");
  assert(calls.length === before, "no request on creation");
});

await run("6. subscribe → run: idle → loading → success", async () => {
  const q = createQuery(api, { method: "GET", path: "users", query: { delay: 10 } });
  const seen = [];
  q.subscribe((s) => seen.push(s.status));

  const pending = q.run();
  assert(q.getSnapshot().isLoading === true, "isLoading is true while in flight");

  const final = await pending;
  assert(seen.join(",") === "idle,loading,success", `transitions [${seen}]`);
  assert(final === q.getSnapshot(), "run() resolves with the current snapshot");
  assert(final.data?.page === 1, "data set on success");
});

await run("7. Refetch keeps previous data while loading", async () => {
  const q = createQuery(api, { method: "GET", path: "users" });
  await q.run();

  const pending = q.run({ query: { page: 2, delay: 10 } });
  const mid = q.getSnapshot();
  assert(mid.isLoading && mid.data?.page === 1, "loading state holds page 1");

  await pending;
  assert(q.getSnapshot().data?.page === 2, "page 2 after refetch");
});

await run("8. Error keeps previous data and exposes the error", async () => {
  const q = createQuery(api, { method: "GET", path: "users" });
  await q.run();
  await q.run({ path: "boom" });

  const s = q.getSnapshot();
  assert(s.isError === true, "isError is true");
  assert(s.error?.name === "HttpError", "error is HttpError");
  assert(s.data?.page === 1, "previous data kept");
});

await run("9. Newest run wins; superseded result is dropped", async () => {
  const q = createQuery(api, { method: "GET", path: "users" });
  const seenPages = [];
  q.subscribe((s) => s.data && seenPages.push(s.data.page));

  const first = q.run({ query: { page: 1, delay: 30 } });
  const second = q.run({ query: { page: 2, delay: 5 } });
  await Promise.all([first, second]);

  assert(q.getSnapshot().data?.page === 2, "final data is from the newest run");
  assert(!seenPages.includes(1), "superseded page 1 never reached listeners");
  assert(q.getSnapshot().status === "success", "not left as a CancelError");
});

await run("10. abort() ends in a CancelError", async () => {
  const q = createQuery(api, { method: "GET", path: "users", query: { delay: 50 } });
  const pending = q.run();
  await tick();
  q.abort();
  const s = await pending;

  assert(s.isError === true, "isError is true");
  assert(s.error?.name === "CancelError", `error is CancelError (got ${s.error?.name})`);
});

await run("11. External signal in config cancels the run", async () => {
  const controller = new AbortController();
  const q = createQuery(api, {
    method: "GET",
    path: "users",
    query: { delay: 50 },
    signal: controller.signal,
  });
  const pending = q.run();
  await tick();
  controller.abort();
  const s = await pending;

  assert(s.error?.name === "CancelError", `error is CancelError (got ${s.error?.name})`);
});

await run("12. Thrown engine errors become error state; run() resolves", async () => {
  // baseURL + url together makes the engine throw
  const q = createQuery(api, { method: "GET", url: "https://other.test/x" });
  const s = await q.run();

  assert(s.isError === true, "isError is true");
  assert(s.error?.message.includes("baseURL"), "error message from engine");
});

await run("13. Unsubscribe stops notifications", async () => {
  const q = createQuery(api, { method: "GET", path: "users" });
  let count = 0;
  const off = q.subscribe(() => count++);
  off();
  await q.run();

  assert(count === 1, `only the immediate call happened (count ${count})`);
});

// ---------------------------------------------------------------
// Summary
// ---------------------------------------------------------------

console.log("\n===================================");
console.log(`  Results: ${passed} passed, ${failed} failed`);
console.log("===================================\n");

process.exit(failed > 0 ? 1 : 0);
