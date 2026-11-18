/**
 * Smoke tests for multiple requests: in-flight dedupe and combineQueries()
 *
 * Run: npm run build && node test/multi.smoke.mjs
 *
 * Uses a mocked global fetch, so no network access is needed.
 * Any unhandled promise rejection crashes Node, which doubles as a check.
 */

import {
  Fetchfully,
  createQuery,
  combineQueries,
  CancelError,
  HttpError,
  NetworkError,
  TimeoutError,
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
// Mock fetch: routes by pathname, `?delay=ms`, honours AbortSignal,
// records every call (with its signal) in `calls`
// ---------------------------------------------------------------

let calls = [];
let networkFailures = 0; // next N calls to /down fail like a dropped connection

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const routes = {
  "/users": (url) => json({ page: Number(url.searchParams.get("page") ?? 1) }),
  "/posts": () => json([{ title: "hello" }]),
  "/boom": () => json({ message: "nope" }, 500),
  "/down": () => {
    if (networkFailures > 0) {
      networkFailures--;
      throw new TypeError("fetch failed");
    }
    return json({ up: true });
  },
};

globalThis.fetch = (input, init = {}) => {
  const url = new URL(String(input));
  calls.push({ url, init, signal: init.signal });
  const delay = Number(url.searchParams.get("delay") ?? 0);

  return new Promise((resolve, reject) => {
    const abort = () =>
      reject(new DOMException("The operation was aborted.", "AbortError"));
    if (init.signal?.aborted) return abort();

    const timer = setTimeout(() => {
      try {
        resolve(routes[url.pathname](url));
      } catch (error) {
        reject(error);
      }
    }, delay);

    init.signal?.addEventListener("abort", () => {
      clearTimeout(timer);
      abort();
    });
  });
};

const reset = () => {
  calls = [];
  networkFailures = 0;
};
const tick = (ms = 0) => new Promise((resolve) => setTimeout(resolve, ms));

const api = Fetchfully.create({ baseURL: BASE });
const DEDUPE = { dedupe: true };

// ---------------------------------------------------------------
// In-flight dedupe
// ---------------------------------------------------------------

await run("1. Off by default: overlapping identical GETs each hit the network", async () => {
  reset();
  await Promise.all([api.get("users", { delay: 10 }), api.get("users", { delay: 10 })]);
  assert(calls.length === 2, `2 fetch calls (got ${calls.length})`);
});

await run("2. On: overlapping identical GETs share one call", async () => {
  reset();
  const [a, b] = await Promise.all([
    api.get("users", { delay: 10 }, DEDUPE),
    api.get("users", { delay: 10 }, DEDUPE),
  ]);

  assert(calls.length === 1, `1 fetch call (got ${calls.length})`);
  assert(a.isSuccess && b.isSuccess, "both succeed");
  assert(a !== b, "each caller gets its own response object");
  assert(a.data === b.data, "data is the same shared object");
  assert(a.refetch !== b.refetch, "each caller gets its own refetch");

  const again = await a.refetch({ query: { page: 3 } });
  assert(again.data?.page === 3, "refetch on a deduped response works");
});

await run("3. Not a cache: sequential GETs each hit the network", async () => {
  reset();
  await api.get("users", undefined, DEDUPE);
  await api.get("users", undefined, DEDUPE);
  assert(calls.length === 2, `2 fetch calls (got ${calls.length})`);
});

await run("4. Different query or headers are not shared", async () => {
  reset();
  await Promise.all([
    api.get("users", { delay: 10, page: 1 }, DEDUPE),
    api.get("users", { delay: 10, page: 2 }, DEDUPE),
  ]);
  assert(calls.length === 2, `different query → 2 calls (got ${calls.length})`);

  reset();
  await Promise.all([
    api.get("users", { delay: 10 }, { ...DEDUPE, headers: { "X-Tenant": "a" } }),
    api.get("users", { delay: 10 }, { ...DEDUPE, headers: { "X-Tenant": "b" } }),
  ]);
  assert(calls.length === 2, `different headers → 2 calls (got ${calls.length})`);
});

await run("5. POST is never deduped", async () => {
  reset();
  await Promise.all([
    api.post("users", { a: 1 }, { delay: 10 }, DEDUPE),
    api.post("users", { a: 1 }, { delay: 10 }, DEDUPE),
  ]);
  assert(calls.length === 2, `2 fetch calls (got ${calls.length})`);
});

await run("6. One caller aborts: it cancels alone, the other succeeds", async () => {
  reset();
  const controller = new AbortController();
  const first = api.get("users", { delay: 30 }, { ...DEDUPE, signal: controller.signal });
  const second = api.get("users", { delay: 30 }, DEDUPE);

  await tick();
  controller.abort();
  const [a, b] = await Promise.all([first, second]);

  assert(calls.length === 1, `1 fetch call (got ${calls.length})`);
  assert(a.error instanceof CancelError, `aborted caller → CancelError (got ${a.error?.name})`);
  assert(b.isSuccess, "other caller succeeds");
  assert(calls[0].signal.aborted === false, "network request was not aborted");
});

await run("7. Every caller aborts: the network request is aborted", async () => {
  reset();
  const c1 = new AbortController();
  const c2 = new AbortController();
  const first = api.get("users", { delay: 30 }, { ...DEDUPE, signal: c1.signal });
  const second = api.get("users", { delay: 30 }, { ...DEDUPE, signal: c2.signal });

  await tick();
  c1.abort();
  assert(calls[0].signal.aborted === false, "still running after the first leaves");
  c2.abort();

  const [a, b] = await Promise.all([first, second]);
  assert(calls[0].signal.aborted === true, "aborted once the last caller leaves");
  assert(a.error instanceof CancelError && b.error instanceof CancelError, "both CancelError");
});

await run("8. Timeouts stay per caller", async () => {
  reset();
  const [a, b] = await Promise.all([
    api.get("users", { delay: 50 }, { ...DEDUPE, timeout: 20 }),
    api.get("users", { delay: 50 }, DEDUPE),
  ]);

  assert(calls.length === 1, `1 fetch call (got ${calls.length})`);
  assert(a.error instanceof TimeoutError, `short timeout → TimeoutError (got ${a.error?.name})`);
  assert(b.isSuccess, "caller without timeout succeeds");
});

await run("9. Response interrupts run once per caller", async () => {
  reset();
  const instance = Fetchfully.create({ baseURL: BASE, dedupe: true });
  let runs = 0;
  instance.interrupts.response.use((response) => {
    runs++;
    return response;
  });

  await Promise.all([instance.get("users", { delay: 10 }), instance.get("users", { delay: 10 })]);
  assert(calls.length === 1, `1 fetch call (got ${calls.length})`);
  assert(runs === 2, `interrupt ran twice (got ${runs})`);
});

await run("10. Shared network failure: callers retry through one shared attempt", async () => {
  reset();
  networkFailures = 1;
  const options = { ...DEDUPE, retries: 1, retryDelay: 10 };
  const [a, b] = await Promise.all([
    api.get("down", { delay: 5 }, options),
    api.get("down", { delay: 5 }, options),
  ]);

  assert(calls.length === 2, `2 fetch calls: 1 failed + 1 retry (got ${calls.length})`);
  assert(a.isSuccess && b.isSuccess, "both succeed after the retry");

  reset();
  networkFailures = 1;
  const [c, d] = await Promise.all([
    api.get("down", { delay: 5 }, DEDUPE),
    api.get("down", { delay: 5 }, DEDUPE),
  ]);
  assert(
    c.error instanceof NetworkError && d.error instanceof NetworkError,
    "without retries both get NetworkError"
  );
});

await run("11. Separate instances never share", async () => {
  reset();
  const one = Fetchfully.create({ baseURL: BASE, dedupe: true });
  const two = Fetchfully.create({ baseURL: BASE, dedupe: true });
  await Promise.all([one.get("users", { delay: 10 }), two.get("users", { delay: 10 })]);
  assert(calls.length === 2, `2 fetch calls (got ${calls.length})`);
});

await run("12. Two queries with the same config share one call", async () => {
  reset();
  const instance = Fetchfully.create({ baseURL: BASE, dedupe: true });
  const config = { method: "GET", path: "users", query: { delay: 10 } };
  const q1 = createQuery(instance, config);
  const q2 = createQuery(instance, config);

  const [s1, s2] = await Promise.all([q1.run(), q2.run()]);
  assert(calls.length === 1, `1 fetch call (got ${calls.length})`);
  assert(s1.isSuccess && s2.isSuccess, "both queries succeed");
});

// ---------------------------------------------------------------
// combineQueries()
// ---------------------------------------------------------------

const query = (path, query = {}) => createQuery(api, { method: "GET", path, query });
const collapse = (list) => list.filter((item, i) => item !== list[i - 1]);

await run("13. Starts idle with a stable snapshot", async () => {
  reset();
  const group = combineQueries([query("users"), query("posts")]);
  const s = group.getSnapshot();

  assert(s.status === "idle" && s.isIdle, 'status is "idle"');
  assert(group.getSnapshot() === s, "snapshot keeps identity");
  assert(Array.isArray(s.data) && s.data.length === 2, "data is a 2-tuple");
  assert(calls.length === 0, "nothing sent on creation");
});

await run("14. run(): idle → loading → success with tuple data", async () => {
  reset();
  const group = combineQueries([query("users", { delay: 10 }), query("posts", { delay: 5 })]);
  const seen = [];
  group.subscribe((s) => seen.push(s.status));

  const final = await group.run();
  assert(collapse(seen).join(",") === "idle,loading,success", `transitions [${collapse(seen)}]`);
  assert(final.isSuccess, "isSuccess");
  assert(final.data[0]?.page === 1 && final.data[1]?.[0]?.title === "hello", "data tuple in order");
  assert(final === group.getSnapshot(), "run() resolves with the current snapshot");
  assert(calls.length === 2, `requests ran in parallel (${calls.length} calls)`);
});

await run("15. One query fails: group error, other data kept", async () => {
  reset();
  const group = combineQueries([query("users"), query("boom")]);
  const s = await group.run();

  assert(s.status === "error" && s.isError, 'status is "error"');
  assert(s.errors[0] === null && s.errors[1] instanceof HttpError, "errors per query");
  assert(s.error === s.errors[1], "error is the first failure");
  assert(s.data[0]?.page === 1, "successful query's data present");
  assert(s.states[1].isError, "states exposes each query");
});

await run("16. Running one query alone makes the group loading", async () => {
  reset();
  const a = query("users", { delay: 10 });
  const group = combineQueries([a, query("posts")]);

  const pending = a.run();
  assert(group.getSnapshot().status === "loading", "loading while one runs");
  await pending;
  assert(group.getSnapshot().status === "idle", "idle after, since the other never ran");
});

await run("17. Subscribe calls immediately; nothing after unsubscribe", async () => {
  reset();
  const group = combineQueries([query("users")]);
  let count = 0;
  const off = group.subscribe(() => count++);

  assert(count === 1, "called immediately on subscribe");
  off();
  await group.run();
  assert(count === 1, `no calls after unsubscribe (count ${count})`);
});

await run("18. abort() cancels every query", async () => {
  reset();
  const group = combineQueries([query("users", { delay: 50 }), query("posts", { delay: 50 })]);
  const pending = group.run();
  await tick();
  group.abort();
  const s = await pending;

  assert(s.isError, "group isError");
  assert(
    s.errors.every((error) => error instanceof CancelError),
    `every query CancelError (got ${s.errors.map((e) => e?.name)})`
  );
});

await run("19. Promise.all over shortcuts never rejects", async () => {
  reset();
  const [ok, bad] = await Promise.all([api.get("users"), api.get("boom")]);
  assert(ok.isSuccess && bad.isError, "resolved with one success and one error");
});

// ---------------------------------------------------------------
// Summary
// ---------------------------------------------------------------

console.log("\n===================================");
console.log(`  Results: ${passed} passed, ${failed} failed`);
console.log("===================================\n");

process.exit(failed > 0 ? 1 : 0);
