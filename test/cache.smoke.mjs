/**
 * Smoke tests for the per-instance response cache and query auto re-run
 *
 * Run: npm run build && node test/cache.smoke.mjs
 *
 * Uses a mocked global fetch, so no network access is needed. Every network
 * response carries an increasing `version`, so a cache hit is easy to spot.
 */

import { Fetchfully, createQuery, combineQueries } from "../dist/fetchfully.mjs";

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
// Mock fetch: "/boom" fails with 500; every other path returns
// { path, page, version }. Honours `?delay=ms` and AbortSignal.
// ---------------------------------------------------------------

let calls = [];
let version = 0;

globalThis.fetch = (input, init = {}) => {
  const url = new URL(String(input));
  calls.push({ url, init });
  const delay = Number(url.searchParams.get("delay") ?? 0);

  return new Promise((resolve, reject) => {
    const abort = () =>
      reject(new DOMException("The operation was aborted.", "AbortError"));
    if (init.signal?.aborted) return abort();

    const timer = setTimeout(() => {
      const status = url.pathname === "/boom" ? 500 : 200;
      const body = {
        path: url.pathname,
        page: Number(url.searchParams.get("page") ?? 1),
        version: ++version,
      };
      resolve(
        new Response(JSON.stringify(body), {
          status,
          headers: { "Content-Type": "application/json" },
        })
      );
    }, delay);

    init.signal?.addEventListener("abort", () => {
      clearTimeout(timer);
      abort();
    });
  });
};

const reset = () => {
  calls = [];
};
const tick = (ms = 0) => new Promise((resolve) => setTimeout(resolve, ms));
const cached = (cache = { staleTime: 1000 }) => Fetchfully.create({ baseURL: BASE, cache });
const collapse = (list) => list.filter((item, i) => item !== list[i - 1]);

// ---------------------------------------------------------------
// Reading and writing
// ---------------------------------------------------------------

await run("1. Off by default: sequential GETs both hit the network", async () => {
  reset();
  const api = Fetchfully.create({ baseURL: BASE });
  await api.get("users");
  await api.get("users");
  assert(calls.length === 2, `2 calls (got ${calls.length})`);
});

await run("2. Fresh hit: second GET is served from the cache", async () => {
  reset();
  const api = cached();
  let interruptRuns = 0;
  api.interrupts.response.use((response) => {
    interruptRuns++;
    return response;
  });

  const a = await api.get("users");
  const b = await api.get("users");

  assert(calls.length === 1, `1 call (got ${calls.length})`);
  assert(b.isSuccess && b.data.version === a.data.version, "same data version");
  assert(a !== b && a.data === b.data, "own response object, shared data");
  assert(interruptRuns === 2, `response interrupts ran on the hit (${interruptRuns})`);
});

await run("3. Entries expire after staleTime", async () => {
  reset();
  const api = cached({ staleTime: 20 });
  await api.get("users");
  await tick(30);
  await api.get("users");
  assert(calls.length === 2, `2 calls after expiry (got ${calls.length})`);
});

await run("4. cache: false skips both read and write", async () => {
  reset();
  const api = cached();
  await api.get("users", undefined, { cache: false });
  await api.get("users");
  assert(calls.length === 2, `nothing was stored by the bypassed call (${calls.length} calls)`);
  await api.get("users");
  assert(calls.length === 2, "normal call stored it; next one hits");
});

await run("5. refetch() goes to the network and updates the entry", async () => {
  reset();
  const api = cached();
  const first = await api.get("users");
  const fresh = await first.refetch();
  const after = await api.get("users");

  assert(calls.length === 2, `refetch hit the network (${calls.length} calls)`);
  assert(fresh.data.version > first.data.version, "refetch returned newer data");
  assert(after.data.version === fresh.data.version, "cache now serves the refetched data");
});

await run("6. Errors and mutations are not cached", async () => {
  reset();
  const api = cached();
  await api.get("boom");
  await api.get("boom");
  assert(calls.length === 2, `errors not stored (${calls.length} calls)`);

  reset();
  await api.post("users", { a: 1 });
  await api.post("users", { a: 1 });
  assert(calls.length === 2, `POST not cached (${calls.length} calls)`);
});

await run("7. Different query or headers are separate entries", async () => {
  reset();
  const api = cached();
  await api.get("users", { page: 1 });
  await api.get("users", { page: 2 });
  await api.get("users", { page: 1 });
  assert(calls.length === 2, `page 1 and 2 stored separately (${calls.length} calls)`);

  reset();
  await api.get("users", undefined, { headers: { Authorization: "Bearer a" } });
  await api.get("users", undefined, { headers: { Authorization: "Bearer b" } });
  assert(calls.length === 2, `different auth header → not shared (${calls.length} calls)`);
});

// ---------------------------------------------------------------
// Invalidation
// ---------------------------------------------------------------

const PATHS = ["users", "users/1", "users-admin", "posts"];
const fill = async (api) => {
  for (const path of PATHS) await api.get(path);
  await api.get("users", { page: 2 });
};
// Which of the filled paths go back to the network now
const refetched = async (api) => {
  const hits = [];
  for (const path of PATHS) {
    const n = calls.length;
    await api.get(path);
    if (calls.length > n) hits.push(path);
  }
  const n = calls.length;
  await api.get("users", { page: 2 });
  if (calls.length > n) hits.push("users?page=2");
  return hits.join(",");
};

await run("8. invalidate(path) matches the path and below, on segment boundaries", async () => {
  reset();
  const api = cached();
  await fill(api);
  api.cache.invalidate("users");
  const hits = await refetched(api);
  assert(hits === "users,users/1,users?page=2", `refetched [${hits}]`);
});

await run("9. invalidate(absolute URL) and invalidate(predicate)", async () => {
  reset();
  const api = cached();
  await fill(api);
  api.cache.invalidate(`${BASE}/posts`);
  assert((await refetched(api)) === "posts", "absolute URL matched posts only");

  api.cache.invalidate((url) => url.includes("-admin"));
  assert((await refetched(api)) === "users-admin", "predicate matched users-admin only");
});

await run("10. clear() drops everything", async () => {
  reset();
  const api = cached();
  await fill(api);
  api.cache.clear();
  const hits = await refetched(api);
  assert(hits.split(",").length === 5, `all 5 refetched [${hits}]`);
});

await run("11. A request in flight during an invalidation is not stored", async () => {
  reset();
  const api = cached();
  const pending = api.get("users", { delay: 30 });
  await tick();
  api.cache.invalidate("users");
  const res = await pending;

  assert(res.isSuccess, "the in-flight caller still gets its result");
  await api.get("users", { delay: 30 });
  assert(calls.length === 2, `result was not cached (${calls.length} calls)`);
});

await run("12. Requests after an invalidation never join one from before it", async () => {
  reset();
  const api = cached();
  const before = api.get("users", { delay: 30 });
  await tick();
  api.cache.invalidate("users");
  const after = api.get("users", { delay: 30 });
  const [a, b] = await Promise.all([before, after]);

  assert(calls.length === 2, `a new request was made (${calls.length} calls)`);
  assert(b.data.version > a.data.version, "post-invalidation caller got newer data");
});

// ---------------------------------------------------------------
// Limits, sharing, instances, requestUrl
// ---------------------------------------------------------------

await run("13. LRU: maxEntries evicts the least recently used", async () => {
  reset();
  const api = cached({ staleTime: 1000, maxEntries: 2 });
  await api.get("a");
  await api.get("b");
  await api.get("a"); // hit: a is now most recently used
  await api.get("c"); // evicts b
  assert(calls.length === 3, `a, b, c fetched (${calls.length} calls)`);

  await api.get("a");
  assert(calls.length === 3, "a still cached");
  await api.get("b");
  assert(calls.length === 4, "b was evicted");
});

await run("14. Caching shares in-flight requests without dedupe", async () => {
  reset();
  const api = cached();
  await Promise.all([api.get("users", { delay: 10 }), api.get("users", { delay: 10 })]);
  assert(calls.length === 1, `1 call (got ${calls.length})`);
});

await run("15. Separate instances have separate caches", async () => {
  reset();
  await cached().get("users");
  await cached().get("users");
  assert(calls.length === 2, `2 calls (got ${calls.length})`);
});

await run("16. requestUrl on network, error, and cache-hit responses", async () => {
  reset();
  const api = cached();
  const fromNetwork = await api.get("users", { page: 3 });
  const fromCache = await api.get("users", { page: 3 });
  const failed = await api.get("boom");

  assert(fromNetwork.requestUrl === `${BASE}/users?page=3`, `network: ${fromNetwork.requestUrl}`);
  assert(fromCache.requestUrl === `${BASE}/users?page=3`, `cache hit: ${fromCache.requestUrl}`);
  assert(failed.requestUrl === `${BASE}/boom`, `error: ${failed.requestUrl}`);
});

// ---------------------------------------------------------------
// createQuery + cache
// ---------------------------------------------------------------

const usersConfig = { method: "GET", path: "users" };

await run("17. Queries read the cache; run({ cache: { staleTime: 0 } }) forces a request", async () => {
  reset();
  const api = cached();
  await createQuery(api, usersConfig).run();
  const second = createQuery(api, usersConfig);
  await second.run();
  assert(calls.length === 1, `second query served from cache (${calls.length} calls)`);

  await second.run({ cache: { staleTime: 0 } });
  assert(calls.length === 2, `forced run hit the network (${calls.length} calls)`);
});

await run("18. A subscribed query re-runs on a matching invalidate", async () => {
  reset();
  const api = cached();
  const query = createQuery(api, usersConfig);
  const seen = [];
  query.subscribe((s) => seen.push(s.status));

  await query.run({ query: { page: 2 } });
  const firstVersion = query.getSnapshot().data.version;

  api.cache.invalidate("posts");
  assert(query.getSnapshot().status === "success", "non-matching invalidate ignored");

  api.cache.invalidate("users");
  assert(query.getSnapshot().isLoading, "re-run starts right away");
  await tick(5);

  const s = query.getSnapshot();
  assert(s.isSuccess && s.data.version > firstVersion, "new data after re-run");
  assert(calls.at(-1).url.searchParams.get("page") === "2", "re-ran with its last override (page 2)");
  assert(collapse(seen).join(",") === "idle,loading,success,loading,success", `transitions [${collapse(seen)}]`);
});

await run("19. Unsubscribed queries don't re-run", async () => {
  reset();
  const api = cached();
  const query = createQuery(api, usersConfig);
  const off = query.subscribe(() => {});
  await query.run();
  off();

  api.cache.invalidate("users");
  await tick(5);
  assert(calls.length === 1, `no re-run after unsubscribe (${calls.length} calls)`);
});

await run("20. Invalidate re-runs queries even with caching off", async () => {
  reset();
  const api = Fetchfully.create({ baseURL: BASE });
  const query = createQuery(api, usersConfig);
  query.subscribe(() => {});
  await query.run();

  api.cache.invalidate("users");
  await tick(5);
  assert(calls.length === 2, `re-ran as a "data changed" signal (${calls.length} calls)`);
});

await run("21. A subscribed group refreshes when one query is invalidated", async () => {
  reset();
  const api = cached();
  const group = combineQueries([createQuery(api, usersConfig), createQuery(api, { method: "GET", path: "posts" })]);
  const seen = [];
  group.subscribe((s) => seen.push(s.status));
  await group.run();

  api.cache.invalidate("posts");
  await tick(5);

  assert(collapse(seen).join(",") === "idle,loading,success,loading,success", `transitions [${collapse(seen)}]`);
  assert(calls.length === 3, `only posts refetched (${calls.length} calls)`);
});

// ---------------------------------------------------------------
// Summary
// ---------------------------------------------------------------

console.log("\n===================================");
console.log(`  Results: ${passed} passed, ${failed} failed`);
console.log("===================================\n");

process.exit(failed > 0 ? 1 : 0);
