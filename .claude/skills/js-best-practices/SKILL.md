---
name: js-best-practices
description: >
  Apply modern JavaScript best practices when writing, reviewing, or refactoring JS/TS code.
  Use this skill whenever the user asks you to write JavaScript or TypeScript code, review
  existing JS/TS code, refactor a JS/TS file, debug JS logic, scaffold a JS project, or
  asks how to do something "the right way" in JS. Also trigger for any task involving
  Node.js scripts, browser JS, React/Vue/Svelte components, or async JS patterns. Even if
  the user doesn't explicitly say "best practices", apply this skill proactively any time
  JS/TS code is being produced or touched — clean, idiomatic code should be the default.
---
 
# JavaScript Best Practices Skill
 
This skill guides Claude to write clean, modern, idiomatic JavaScript and TypeScript. Apply
these standards whenever producing or reviewing JS/TS code.
 
---
 
## Quick Reference — The Non-Negotiables
 
These apply in virtually every situation:
 
| Rule | Do | Don't |
|------|----|-------|
| Variable declarations | `const` by default, `let` to reassign | `var` (ever) |
| Async | `async/await` + `try/catch` | Nested `.then()` chains, raw callbacks |
| Types | TypeScript or JSDoc types for public APIs | Implicit `any`, untyped params |
| Equality | `===` / `!==` | `==` / `!=` |
| Null guards | Optional chaining `?.`, nullish coalescing `??` | Long `&&` chains, `||` for defaults |
| Modules | ES Modules (`import`/`export`) | `require()` in new code |
| Errors | Always handle — never silent `catch {}` | Swallowing errors |
| Naming | `camelCase` vars/funcs, `PascalCase` classes, `SCREAMING_SNAKE` constants | Abbreviations, single letters (except loop indices) |
 
---
 
## 1. Variable Declarations
 
```js
// ✅ const for things that don't change reference
const MAX_RETRIES = 3;
const user = { name: "Ada" };  // object contents can still mutate
 
// ✅ let only when you'll reassign
let retryCount = 0;
 
// ❌ var — function-scoped and hoisted in confusing ways
var broken = true;
```
 
**Rule:** Start every declaration as `const`. Downgrade to `let` only if you hit a reassignment. Never use `var`.
 
---
 
## 2. Async / Await
 
Prefer `async/await` over promise chains. It reads like synchronous code and makes error handling straightforward.
 
```js
// ✅ Idiomatic async
async function fetchUser(id) {
  try {
    const response = await fetch(`/api/users/${id}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (err) {
    console.error("fetchUser failed:", err);
    throw err; // Re-throw; don't silently swallow
  }
}
 
// ❌ Nested .then() — hard to follow, error handling scattered
fetch(`/api/users/${id}`)
  .then(r => r.json())
  .then(data => doSomething(data))
  .catch(err => console.error(err));
```
 
**Parallel async:** Use `Promise.all` when operations are independent:
 
```js
// ✅ Runs both requests simultaneously
const [user, posts] = await Promise.all([fetchUser(id), fetchPosts(id)]);
 
// ❌ Sequential — 2× slower for no reason
const user = await fetchUser(id);
const posts = await fetchPosts(id);
```
 
For partial failures where you want each result (success or error), use `Promise.allSettled`.
 
---
 
## 3. Null Safety — Optional Chaining & Nullish Coalescing
 
```js
// ✅ Optional chaining — stops at first null/undefined, returns undefined
const city = user?.address?.city;
 
// ✅ Nullish coalescing — fallback only for null/undefined (not 0, "", false)
const displayName = user?.name ?? "Anonymous";
 
// ❌ Old-style guard chain — verbose and fragile
const city = user && user.address && user.address.city;
 
// ❌ || as default — incorrectly treats 0 and "" as falsy
const count = value || 0;  // Bug: if value is 0, it's replaced!
```
 
---
 
## 4. Destructuring & Spread
 
```js
// ✅ Destructuring — readable, avoids repetitive property access
const { name, age = 18 } = user;                    // with default
const [first, ...rest] = items;                     // arrays
function greet({ name, role = "member" }) { ... }  // in params
 
// ✅ Spread — immutable object/array operations
const updated = { ...user, lastSeen: Date.now() };  // object update
const merged = [...listA, ...listB];                // array merge
```
 
---
 
## 5. Modern Array Methods
 
Prefer declarative array methods over imperative loops where clarity improves:
 
```js
const users = [{ name: "Ada", active: true }, { name: "Bob", active: false }];
 
const activeNames = users
  .filter(u => u.active)
  .map(u => u.name);
// → ["Ada"]
 
// Grouping (ES2024+, widely supported)
const byStatus = Object.groupBy(users, u => u.active ? "active" : "inactive");
 
// Flat + map in one step
const tags = posts.flatMap(p => p.tags);
```
 
Use `for...of` when you need `await` inside the loop body. `forEach` can't be awaited.
 
```js
// ✅ Awaitable loop
for (const item of items) {
  await processItem(item);
}
 
// ❌ await inside forEach is ignored — doesn't do what you think
items.forEach(async item => await processItem(item));
```
 
---
 
## 6. Error Handling
 
**Never swallow errors silently.**
 
```js
// ✅ Catch, log, decide: re-throw, return fallback, or handle
try {
  const data = await fetchData();
  return data;
} catch (err) {
  logger.error("fetchData failed", { err, context });
  throw new AppError("Could not load data", { cause: err });
}
 
// ❌ Silent swallow — hides bugs permanently
try {
  riskyOperation();
} catch (_) {}
```
 
**Custom error classes** for typed error handling:
 
```js
class ValidationError extends Error {
  constructor(message, field) {
    super(message);
    this.name = "ValidationError";
    this.field = field;
  }
}
 
// Caller can distinguish error types
try {
  validate(input);
} catch (err) {
  if (err instanceof ValidationError) showFieldError(err.field);
  else throw err;
}
```
 
---
 
## 7. TypeScript & Type Safety
 
TypeScript is the industry default in 2025. For new projects, prefer `.ts`/`.tsx`. For plain JS, use JSDoc types.
 
```ts
// ✅ Explicit types for function signatures
function getUser(id: string): Promise<User> { ... }
 
// ✅ Interfaces for shape, types for unions/aliases
interface User {
  id: string;
  name: string;
  role: "admin" | "member";
}
 
// ❌ Never use `any` — it turns off the type checker for that value
function process(data: any) { ... }  // defeats the purpose
 
// ✅ Use `unknown` when type is truly unknown, then narrow
function process(data: unknown) {
  if (typeof data === "string") { ... }
}
```
 
**Type narrowing over casting:**
```ts
// ✅ Narrow with typeof / instanceof
if (err instanceof Error) console.log(err.message);
 
// ❌ Casting bypasses safety
const msg = (err as Error).message;  // use sparingly
```
 
For JSDoc in plain JS:
```js
/**
 * @param {string} id
 * @returns {Promise<User>}
 */
async function getUser(id) { ... }
```
 
---
 
## 8. Modules & Code Organization
 
```js
// ✅ ES Modules — named exports preferred for tree-shaking
export function formatDate(date) { ... }
export const MAX_SIZE = 100;
 
// Default export only for the primary thing a module represents
export default class UserService { ... }
 
// ✅ Barrel files for clean imports (use sparingly — can hurt tree-shaking)
// index.js
export { formatDate } from "./formatDate.js";
export { parseDate } from "./parseDate.js";
```
 
**File/folder naming:** `kebab-case` for files (`user-service.ts`), `PascalCase` for classes/components.
 
---
 
## 9. Performance Patterns
 
**Debounce & throttle** for high-frequency events:
```js
// Debounce: wait until user stops typing
const handleSearch = debounce((query) => search(query), 300);
input.addEventListener("input", e => handleSearch(e.target.value));
 
// Throttle: fire at most once per interval (scroll, resize)
const handleScroll = throttle(() => updateUI(), 100);
```
 
**Memoization** for expensive pure computations:
```js
const memo = new Map();
function expensiveCalc(n) {
  if (memo.has(n)) return memo.get(n);
  const result = /* heavy computation */;
  memo.set(n, result);
  return result;
}
```
 
**Avoid premature optimization.** Measure first with Lighthouse / Chrome DevTools before rewriting.
 
---
 
## 10. Security Essentials
 
```js
// ❌ XSS — never inject user input as raw HTML
element.innerHTML = userInput;
 
// ✅ Use textContent for text, or sanitize (DOMPurify) for HTML
element.textContent = userInput;
 
// ✅ Parameterized queries — never string-interpolate SQL
db.query("SELECT * FROM users WHERE id = ?", [userId]);
 
// ✅ Validate & sanitize all inputs at the boundary — including in Server Actions
function createPost(input: unknown) {
  const parsed = PostSchema.parse(input); // e.g. Zod
  return db.posts.create(parsed);
}
```
 
**Environment variables:** Never hardcode secrets. Use `.env` files (not committed) and a secrets manager in production.
 
---
 
## 11. Code Style Automation
 
Use tooling so style debates don't consume review cycles:
 
- **ESLint** — catches bugs and enforces patterns. Use `eslint:recommended` + `@typescript-eslint/recommended`.
- **Prettier** — formats code automatically. No style debates.
- **Husky + lint-staged** — run linting on pre-commit so nothing slips through.
 
Minimal `eslint.config.js`:
```js
import js from "@eslint/js";
import tsPlugin from "@typescript-eslint/eslint-plugin";
 
export default [
  js.configs.recommended,
  {
    plugins: { "@typescript-eslint": tsPlugin },
    rules: {
      "no-var": "error",
      "prefer-const": "error",
      "no-unused-vars": "warn",
      "@typescript-eslint/no-explicit-any": "error",
    }
  }
];
```
 
---
 
## 12. Testing
 
Write tests for logic that can break. Co-locate test files: `user.ts` → `user.test.ts`.
 
```ts
// Node.js built-in (v20+)
import { test, describe, it } from "node:test";
import assert from "node:assert/strict";
 
describe("formatCurrency", () => {
  it("formats USD correctly", () => {
    assert.equal(formatCurrency(1234.5, "USD"), "$1,234.50");
  });
  it("handles zero", () => {
    assert.equal(formatCurrency(0, "USD"), "$0.00");
  });
});
```
 
**Test what matters:** business logic, edge cases, error paths. Don't test framework internals or implementation details.
 
---
 
## Detailed References
 
For deeper guidance on specific topics, see:
 
- `references/async-patterns.md` — advanced Promise patterns, AbortController, async iterators
- `references/typescript-patterns.md` — generics, utility types, type narrowing, declaration files
- `references/security.md` — OWASP top 10 for JS, CSP, sanitization libraries
- `references/node-specifics.md` — Node.js streams, EventEmitter, file I/O, environment config
 
Load a reference file only when the user's task specifically requires it.