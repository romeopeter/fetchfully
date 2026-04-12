# Node.js Specifics
 
## Environment Configuration
 
```js
// ✅ Validate env vars at startup — fail loudly rather than fail silently later
const env = {
  PORT: parseInt(process.env.PORT ?? "3000"),
  DATABASE_URL: required("DATABASE_URL"),
  NODE_ENV: process.env.NODE_ENV ?? "development",
};
 
function required(name) {
  const val = process.env[name];
  if (!val) throw new Error(`Environment variable ${name} is required`);
  return val;
}
```
 
Or use `dotenv` + Zod for full typed env validation:
 
```ts
import { z } from "zod";
import dotenv from "dotenv";
dotenv.config();
 
const Env = z.object({
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().url(),
});
 
export const env = Env.parse(process.env);
```
 
---
 
## File I/O — Async First
 
```js
import { readFile, writeFile } from "node:fs/promises";
 
// ✅ Async — doesn't block the event loop
const content = await readFile("./data.json", "utf8");
const parsed = JSON.parse(content);
 
// ❌ Sync — blocks all incoming requests while reading
const content = fs.readFileSync("./data.json", "utf8");
```
 
**Streams** for large files — don't load the whole file into memory:
 
```js
import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
 
const rl = createInterface({ input: createReadStream("large.csv") });
for await (const line of rl) {
  processLine(line);
}
```
 
---
 
## EventEmitter Patterns
 
```js
import { EventEmitter } from "node:events";
 
class JobQueue extends EventEmitter {
  add(job) {
    this.emit("job:added", job);
    // ...
  }
}
 
const queue = new JobQueue();
queue.on("job:added", (job) => console.log("New job:", job.id));
 
// ✅ Always remove listeners when done to prevent memory leaks
queue.once("drain", () => cleanup()); // fires once then removes itself
```
 
**Max listeners warning:** If you see "possible EventEmitter memory leak", you likely have an `on()` inside a loop. Use `once()` or explicitly `off()`.
 
---
 
## Error Handling in Express / HTTP Servers
 
```js
// ✅ Async route handler wrapper — catches thrown errors
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
 
app.get("/users/:id", asyncHandler(async (req, res) => {
  const user = await getUserById(req.params.id);
  if (!user) return res.status(404).json({ error: "Not found" });
  res.json(user);
}));
 
// ✅ Centralized error handler (4 params = Express error handler)
app.use((err, req, res, next) => {
  const status = err.status ?? 500;
  const message = status < 500 ? err.message : "Internal Server Error";
  res.status(status).json({ error: message });
});
```
 
---
 
## Graceful Shutdown
 
```js
async function shutdown(signal) {
  console.log(`Received ${signal}. Shutting down gracefully...`);
  await server.close();       // stop accepting new connections
  await db.disconnect();      // close DB pool
  process.exit(0);
}
 
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
```
 
This prevents dropped requests and data corruption on deploy/restart.
 
---
 
## Native Test Runner (Node 20+)
 
No test library required for unit tests:
 
```js
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
 
describe("UserService", () => {
  let service;
  before(() => { service = new UserService(mockDb); });
 
  it("returns user by id", async () => {
    const user = await service.getById("123");
    assert.equal(user.id, "123");
  });
 
  it("throws on missing user", async () => {
    await assert.rejects(
      () => service.getById("missing"),
      { name: "NotFoundError" }
    );
  });
});
```
 
Run: `node --test` or `node --test --watch`.
