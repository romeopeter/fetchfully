/**
 * Smoke tests for Fetchfully interrupts (request + response)
 *
 * Run: npm run build && node test/interrupts.smoke.mjs
 */

import { Fetchfully } from "../dist/fetchfully.mjs";

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

await run("1. Request interrupt — header injection", async () => {
  const fetcher = Fetchfully.create({ baseURL: BASE });

  let capturedConfig = null;
  fetcher.interrupts.request.use((config) => {
    capturedConfig = config;
    config.headers["X-Test-Header"] = "smoke-test";
    return config;
  });

  await fetcher.get("/posts/1");

  assert(capturedConfig !== null, "interrupt was called");
  assert(capturedConfig.headers["X-Test-Header"] === "smoke-test", "header was injected into config");
});

await run("2. Request interrupt — async handler", async () => {
  const fetcher = Fetchfully.create({ baseURL: BASE });

  let ran = false;
  fetcher.interrupts.request.use(async (config) => {
    await new Promise((resolve) => setTimeout(resolve, 10));
    ran = true;
    return config;
  });

  await fetcher.get("/posts/1");
  assert(ran === true, "async request interrupt ran");
});

await run("3. Request interrupt — multiple handlers run in order", async () => {
  const fetcher = Fetchfully.create({ baseURL: BASE });
  const order = [];

  fetcher.interrupts.request.use((config) => { order.push(1); return config; });
  fetcher.interrupts.request.use((config) => { order.push(2); return config; });
  fetcher.interrupts.request.use((config) => { order.push(3); return config; });

  await fetcher.get("/posts/1");

  assert(order.join(",") === "1,2,3", `handlers ran in order [${order}]`);
});

await run("4. Response interrupt — onFulfilled on success", async () => {
  const fetcher = Fetchfully.create({ baseURL: BASE });

  let interceptedResponse = null;
  fetcher.interrupts.response.use(
    (response) => {
      interceptedResponse = response;
      return response;
    }
  );

  const res = await fetcher.get("/posts/1");

  assert(interceptedResponse !== null, "onFulfilled was called");
  assert(interceptedResponse.isSuccess === true, "onFulfilled received success response");
  assert(res.data?.id === 1, "response data unchanged after interrupt");
});

await run("5. Response interrupt — onRejected on error", async () => {
  const fetcher = Fetchfully.create({ baseURL: BASE });

  let rejectedResponse = null;
  fetcher.interrupts.response.use(
    undefined,
    (response) => {
      rejectedResponse = response;
      return response;
    }
  );

  const res = await fetcher.get("/nonexistent-endpoint-404");

  assert(rejectedResponse !== null, "onRejected was called on error response");
  assert(rejectedResponse.isError === true, "onRejected received error response");
  assert(res.isError === true, "final response is still an error");
});

await run("6. Response interrupt — transform response data", async () => {
  const fetcher = Fetchfully.create({ baseURL: BASE });

  fetcher.interrupts.response.use((response) => {
    return { ...response, data: { ...response.data, injected: true } };
  });

  const res = await fetcher.get("/posts/1");

  assert(res.data?.injected === true, "response was transformed by interrupt");
  assert(res.data?.id === 1, "original data preserved");
});

await run("7. Eject — removed handler does not run", async () => {
  const fetcher = Fetchfully.create({ baseURL: BASE });

  let ran = false;
  const eject = fetcher.interrupts.request.use((config) => {
    ran = true;
    return config;
  });

  eject();

  await fetcher.get("/posts/1");
  assert(ran === false, "ejected handler did not run");
});

await run("8. Eject — only removes the target handler", async () => {
  const fetcher = Fetchfully.create({ baseURL: BASE });
  const ran = [];

  fetcher.interrupts.request.use((config) => { ran.push("a"); return config; });
  const eject = fetcher.interrupts.request.use((config) => { ran.push("b"); return config; });
  fetcher.interrupts.request.use((config) => { ran.push("c"); return config; });

  eject(); // remove only "b"

  await fetcher.get("/posts/1");
  assert(!ran.includes("b"), "ejected handler 'b' did not run");
  assert(ran.includes("a") && ran.includes("c"), `remaining handlers ran [${ran}]`);
});

await run("9. Interrupts are isolated per instance", async () => {
  const fetcherA = Fetchfully.create({ baseURL: BASE });
  const fetcherB = Fetchfully.create({ baseURL: BASE });

  let aRan = false;
  let bRan = false;

  fetcherA.interrupts.request.use((config) => { aRan = true; return config; });
  fetcherB.interrupts.request.use((config) => { bRan = true; return config; });

  await fetcherA.get("/posts/1");

  assert(aRan === true, "fetcherA interrupt ran");
  assert(bRan === false, "fetcherB interrupt did not bleed into fetcherA");
});

// ---------------------------------------------------------------
// Summary
// ---------------------------------------------------------------

console.log("\n===================================");
console.log(`  Results: ${passed} passed, ${failed} failed`);
console.log("===================================\n");

process.exit(failed > 0 ? 1 : 0);
