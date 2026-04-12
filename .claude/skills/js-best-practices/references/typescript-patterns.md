# TypeScript Patterns
 
## Utility Types — The Most Useful Ones
 
```ts
interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "member";
}
 
type PartialUser = Partial<User>;          // all fields optional
type RequiredUser = Required<User>;        // all fields required
type UserPreview = Pick<User, "id"|"name">;// only these fields
type UserInput = Omit<User, "id">;         // all except id
type ReadonlyUser = Readonly<User>;        // no mutation
 
// Record — typed key-value maps
type RolePermissions = Record<User["role"], string[]>;
```
 
---
 
## Generics — Write Once, Type Safely
 
```ts
// Generic response wrapper
interface ApiResponse<T> {
  data: T;
  error: string | null;
  timestamp: number;
}
 
async function get<T>(url: string): Promise<ApiResponse<T>> {
  const res = await fetch(url);
  return res.json();
}
 
// Usage — TypeScript knows the shape
const { data } = await get<User>("/api/me");
// data.name ✅ — fully typed
```
 
---
 
## Type Narrowing Patterns
 
```ts
// typeof — for primitives
function formatInput(value: string | number) {
  if (typeof value === "string") return value.trim();
  return value.toFixed(2);
}
 
// instanceof — for class instances
function handleError(err: unknown) {
  if (err instanceof ValidationError) showField(err.field);
  else if (err instanceof Error) toast(err.message);
  else toast("Unknown error");
}
 
// Discriminated unions — the most powerful pattern
type Result<T> =
  | { status: "ok"; data: T }
  | { status: "error"; message: string };
 
function handle<T>(result: Result<T>) {
  if (result.status === "ok") {
    console.log(result.data); // TypeScript knows data exists here
  } else {
    console.error(result.message); // and message exists here
  }
}
```
 
---
 
## `satisfies` Operator (TS 4.9+)
 
```ts
// satisfies validates shape without widening the type
const config = {
  port: 3000,
  host: "localhost",
} satisfies Record<string, string | number>;
 
config.port.toFixed(2); // ✅ TypeScript keeps port as `number`, not `string | number`
```
 
---
 
## `noUncheckedIndexedAccess`
 
Enable in `tsconfig.json` for safer array/object access:
 
```json
{
  "compilerOptions": {
    "noUncheckedIndexedAccess": true,
    "strict": true
  }
}
```
 
With this on, `arr[0]` has type `T | undefined`, forcing you to handle the case.
 
---
 
## Declaration Files (`.d.ts`)
 
When consuming a JS library without types, create a minimal declaration:
 
```ts
// types/legacy-lib.d.ts
declare module "legacy-lib" {
  export function compute(input: string): number;
}
```
 
For global augmentation (adding to `window`, `process.env`, etc.):
 
```ts
// types/global.d.ts
declare global {
  interface Window {
    analytics: AnalyticsClient;
  }
}
export {}; // makes it a module, required
```