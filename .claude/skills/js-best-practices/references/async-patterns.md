# Advanced Async Patterns
 
## AbortController — Cancellable Requests
 
```js
async function fetchWithTimeout(url, timeoutMs = 5000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
 
  try {
    const response = await fetch(url, { signal: controller.signal });
    return await response.json();
  } catch (err) {
    if (err.name === "AbortError") throw new Error(`Request timed out after ${timeoutMs}ms`);
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
```
 
Use `AbortController` whenever a user can navigate away or cancel an operation — prevents stale updates and memory leaks.
 
---
 
## Async Iterators — Streaming / Pagination
 
```js
async function* paginate(baseUrl) {
  let page = 1;
  while (true) {
    const data = await fetch(`${baseUrl}?page=${page}`).then(r => r.json());
    if (!data.items.length) break;
    yield data.items;
    page++;
  }
}
 
for await (const items of paginate("/api/records")) {
  processItems(items);
}
```
 
Use async generators when data comes in chunks: paginated APIs, file streams, WebSocket messages.
 
---
 
## Promise Combinators — When to Use Each
 
| Combinator | Behavior | Use When |
|-----------|----------|----------|
| `Promise.all` | Fails fast on first rejection | All must succeed |
| `Promise.allSettled` | Waits for all, returns results + errors | Partial success acceptable |
| `Promise.race` | First to settle wins | Timeout races |
| `Promise.any` | First to **succeed** wins | Try multiple sources |
 
```js
// Race pattern — first of three mirrors to respond
const data = await Promise.any([
  fetch("https://cdn1.example.com/data"),
  fetch("https://cdn2.example.com/data"),
  fetch("https://cdn3.example.com/data"),
]);
```
 
---
 
## Async Queues — Concurrency Limiting
 
When you have many async tasks but want to cap concurrency (avoid hammering an API):
 
```js
async function processWithConcurrency(items, handler, limit = 5) {
  const results = [];
  const executing = new Set();
 
  for (const item of items) {
    const p = handler(item).then(r => {
      executing.delete(p);
      return r;
    });
    executing.add(p);
    results.push(p);
 
    if (executing.size >= limit) {
      await Promise.race(executing);
    }
  }
 
  return Promise.all(results);
}
```
 
Or use a library like `p-limit` for cleaner code in production.
 
---
 
## Top-Level Await
 
In ES Modules (`.mjs` or `"type": "module"` in `package.json`), you can `await` at the top level:
 
```js
// db-init.mjs
export const db = await connectDatabase(process.env.DATABASE_URL);
```
 
Useful for module initialization. Not available in CommonJS.