# Fetchfully - Project Documentation

## Overview

**Fetchfully** is a lightweight TypeScript HTTP client library that enhances the native JavaScript Fetch API with developer-friendly features and better defaults.

- **Version**: 1.6.1
- **License**: MIT
- **Repository**: https://github.com/romeopeter/fetchfully
- **Author**: Romeo Agbor Peter
- **Bundle Size**: ~873 lines of TypeScript
- **Dependencies**: Zero runtime dependencies

## What Problem Does It Solve?

The native Fetch API is powerful but verbose and lacks convenient features. Fetchfully wraps it to provide:

1. Cleaner, object-based configuration API
2. Automatic response parsing based on Content-Type
3. Built-in request refetching capability
4. Request status tracking (loading, success, error states)
5. Enhanced URL construction (path params, query params)
6. Better error handling with custom error types
7. Global and instance-level configuration
8. Convenient HTTP method shortcuts
9. Request/response interrupts (per-instance, with eject support)

## Architecture

### Core Design Patterns

1. **Factory Pattern**: `createFetch()` creates new fetch instances with isolated configurations
2. **Configuration Hierarchy**: Default Config → Factory Config → Instance Config (deep merge)
3. **Strategy Pattern**: Separate handlers for GET requests vs mutations (POST/PUT/PATCH/DELETE)
4. **Closure Pattern**: Consumable methods capture instance configuration

### Request/Response Lifecycle

```
User Call → Config Merge → Request Interrupts → URL Construction →
Fetch Execution → Response Handler → Content-Type Parsing →
Status Wrapper → Response Interrupts → Return with Refetch Capability
```

### Project Structure

```
src/
├── consumable-methods/          # HTTP method shortcuts
│   ├── index.ts                # Attaches methods to instance
│   ├── get.ts                  # GET method factory
│   ├── post.ts                 # POST method factory
│   ├── put.ts                  # PUT method factory
│   ├── patch.ts                # PATCH method factory
│   └── delete.ts               # DELETE method factory
├── utils/                      # Utility functions
│   ├── custom-request-errors.ts        # Custom error classes
│   ├── filter-by-content-type.ts       # Response parsing by content type
│   ├── mergeConfig.ts                  # Config merging logic
│   ├── request-headers-formatter.ts    # Header formatting
│   └── url-parameters.ts               # URL construction utilities
├── default-config.ts           # Default configuration
├── engine.ts                   # Core fetch engine (the heart of the library)
├── fetchfully.ts               # Main instance creation
├── index.ts                    # Public exports
├── interrupts.ts               # InterruptStack classes and runner functions
├── mutation-query.ts           # Mutation request handler (POST/PUT/PATCH/DELETE)
├── request-query.ts            # GET request handler
├── response.ts                 # Response object factory
└── types.ts                    # TypeScript type definitions
```

```
test/
└── interrupts.smoke.mjs        # Smoke tests for the interrupt system
```

## Key Features

### 1. Object-First Configuration
All request options are passed as a single configuration object for clarity:

```typescript
fetcher.get({ url: '/users', params: { page: 1 } })
```

### 2. Automatic Response Handling
Automatically parses responses based on Content-Type headers:
- `application/json` → JSON.parse()
- `multipart/form-data` → FormData
- `application/octet-stream` → ArrayBuffer
- `image/*`, `video/*` → Blob
- Fallback → Text

### 3. Enhanced URL Building

**Path Parameters**:
```typescript
// String: "/users/123"
{ url: '/users', pathParams: "123" }

// Array: "/users/123/posts/456"
{ url: '/users', pathParams: ["123", "posts", "456"] }
```

**Query Parameters** with flexible array formatting:
- `brackets`: `colors[]=red&colors[]=blue`
- `comma`: `colors=red,blue`
- `repeat`: `colors=red&colors=blue` (default)
- `none`: `colors=red blue`

### 4. Global and Instance Configuration

**Global defaults**:
```typescript
Fetchfully.defaults.baseURL = 'https://api.example.com'
Fetchfully.defaults.headers = { 'Authorization': 'Bearer token' }
```

**Independent instances**:
```typescript
const apiClient = Fetchfully.create({
  baseURL: 'https://api.example.com',
  timeout: 5000
})
```

### 5. Request Status Tracking
Every response includes status indicators:
```typescript
const response = await fetcher.get({ url: '/users' })
// response.isLoading, .isSuccess, .isError, .isIdle
// response.status: 'idle' | 'loading' | 'success' | 'error'
```

### 6. Refetch Capability
```typescript
const response = await fetcher.get({ url: '/users' })
// Later...
await response.refetch() // Re-executes with same config
await response.refetch({ params: { page: 2 } }) // Override params
```

### 7. Custom Error Types
- `NetworkError`: Fetch failures (no connection, DNS failure)
- `HttpError`: Non-2xx HTTP responses
- `CorsError`: Cross-origin request issues
- `TimeoutError`: Request exceeded timeout duration

### 8. Timeout Support
Uses AbortController to enforce request timeouts:
```typescript
fetcher.get({ url: '/users', timeout: 5000 }) // 5 seconds
```

### 9. Interrupts
Per-instance request and response interrupts. Each `use()` call returns an eject function for cleanup.

```typescript
// Inject auth header on every request
fetcher.interrupts.request.use((config) => {
  config.headers['Authorization'] = `Bearer ${token}`
  return config
})

// Handle 401 globally, transform data on success
fetcher.interrupts.response.use(
  (response) => response,                          // onFulfilled
  (response) => {                                  // onRejected
    if (response.statusCode === 401) redirectToLogin()
    return response
  }
)

// Eject when no longer needed (e.g. component unmount)
const eject = fetcher.interrupts.request.use(handler)
eject()
```

## Core Modules

### `engine.ts` (The Heart)
- `createFetch()`: Main factory function
- Creates per-instance `InterruptStack` for request and response
- Merges configuration hierarchy, then pipes config through request interrupts
- Constructs full URLs with path/query parameters
- Implements AbortController for timeouts
- Delegates to `requestQuery` or `mutationQuery` based on HTTP method
- Pipes final response through response interrupts before returning
- Attaches consumable HTTP methods and `interrupts` to the instance

### `interrupts.ts`
- `RequestInterruptStack`: generic stack with `use(handler) → eject`
- `ResponseInterruptStack`: separate class; `use(onFulfilled?, onRejected?) → eject`
- `runRequestInterrupts()`: pipes config through request handlers in order
- `runResponseInterrupts()`: routes response to `onFulfilled` or `onRejected` based on `isError`

### `request-query.ts`
Handles GET requests:
- Validates `response.ok`
- Filters response by Content-Type
- Returns standardized FetchfullyResponse
- Returns error response (not throws) for non-ok responses

### `mutation-query.ts`
Handles POST/PUT/PATCH/DELETE requests:
- Status code handling:
  - **200/201**: Success (POST/PUT)
  - **204/304**: Success (PATCH)
  - **202/204**: Success (DELETE)
  - **400-499**: Client errors (returns error response)
  - **500-599**: Server errors (returns error response)

### `response.ts`
Response factory that creates standardized response objects with:
- Original data
- Status indicators (isLoading, isSuccess, isError, isIdle)
- Refetch function (closure over original config)

## Tech Stack

### Build System
- **TypeScript**: v5.6.2 (strict mode enabled)
- **Build Tool**: Vite v5.4.8
- **Plugin**: vite-plugin-dts for TypeScript declarations
- **Target**: ES2020

### Output Formats
- **ESM**: `dist/fetchfully.mjs` (ES Modules)
- **UMD**: `dist/fetchfully.cjs` (CommonJS)
- **Types**: `dist/index.d.ts`

### TypeScript Configuration
- Strict mode: enabled
- No implicit any: checked
- Unused locals/parameters: checked
- Declaration files: generated
- Source maps: enabled

## Entry Points

### Main Export (`src/index.ts`)
Exports two named instances (same object, different names):
```typescript
export { default as Fetchfully } from "./fetchfully"
export { default as Http } from "./fetchfully"
```

Both can be used interchangeably:
```typescript
import { Fetchfully } from 'fetchfully'
// or
import { Http } from 'fetchfully'
```

## Development

### NPM Scripts
```bash
npm run dev    # Start development mode (Vite)
npm run build  # Build for production
```

### Build Output
- Main (CommonJS): `./dist/fetchfully.cjs`
- Module (ESM): `./dist/fetchfully.mjs`
- Types: `./dist/index.d.ts`

### Package Configuration
```json
{
  "type": "module",           // ESM by default
  "main": "./dist/fetchfully.cjs",
  "module": "./dist/fetchfully.mjs",
  "types": "./dist/index.d.ts"
}
```

## Known Issues and Areas for Improvement

### Recent Fixes (bug-fixes branch)
1. ✅ **URL Query String Bug** (Fixed in `src/utils/url-parameters.ts:95`):
   - Removed extra `/` before query strings that caused malformed URLs
2. ✅ **Error Handling Improvements**:
   - Updated `request-query.ts` and `mutation-query.ts` to return error responses instead of throwing
   - Added validation to prevent both `baseURL` and `url` being set simultaneously
3. ✅ **Code Cleanup**:
   - Refactored baseURL/url handling in `engine.ts` for better clarity
   - Removed debug console.log statements

### Recent Additions (middleware branch)
1. ✅ **Request/Response Interrupts** (`src/interrupts.ts`):
   - Per-instance `request` and `response` interrupt stacks
   - `use()` returns eject function for cleanup
   - Response interrupt routes on `isError` — no throwing required

### Missing Features
1. **No Test Suite**: No automated tests configured (smoke tests exist in `test/`)
2. **Cancel Method**: Typed in response interface but not implemented
3. **Retry Logic**: Partially typed but not implemented

### Suggested Improvements
1. Add test framework (Vitest would integrate well with Vite)
2. Implement proper request cancellation (via external AbortSignal — no destructuring)
3. Add retry logic with fixed delay (developer tool, not customer-facing)
4. Add progress tracking for uploads/downloads

## Working with the Codebase

### Adding New Features
1. **New HTTP methods**: Add to `src/consumable-methods/`
2. **New utilities**: Add to `src/utils/`
3. **Core logic changes**: Modify `src/engine.ts`
4. **Type changes**: Update `src/types.ts`

### Configuration Flow
```
src/default-config.ts        # Base defaults
    ↓
Fetchfully.defaults          # Global runtime defaults
    ↓
Fetchfully.create({ ... })   # Factory-level config
    ↓
fetcher.get({ ... })         # Request-level config
```

Each level deep-merges with previous levels (via `mergeConfig` utility).

### Error Handling Flow
```
Fetch Error → Check Error Type:
  - TypeError → NetworkError or CorsError
  - AbortError → TimeoutError
  - Non-2xx status → HttpError
```

All custom errors extend base `Error` class and include:
- `message`: Human-readable description
- `name`: Error type name
- Additional context (status code, response data, etc.)

## Type Safety

The library is fully typed with TypeScript generics:

```typescript
interface User {
  id: number
  name: string
}

const response = await fetcher.get<User>({ url: '/users/1' })
// response.data is typed as User
```

All public APIs have complete type definitions in `src/types.ts`.

## Skills

### JS Best Practices (`.claude/skills/js-best-practices/`)
All JS/TS code in this project should follow the conventions defined in `SKILL.md`. Key rules: `const` by default, `async/await` over promise chains, strict TypeScript (no `any`), `===` equality, optional chaining/nullish coalescing, ES Modules, and meaningful error handling (never swallow errors silently).

Reference docs for deeper topics live in `references/`:
- `async-patterns.md` — Promise patterns, AbortController, async iterators
- `typescript-patterns.md` — generics, utility types, type narrowing
- `security.md` — OWASP top 10 for JS, CSP, sanitization
- `node-specifics.md` — Node.js streams, EventEmitter, file I/O

## Git Information

- **Current Branch**: middleware
- **Main Branch**: main (use for PRs)
- **Latest Commit**: 2e7b853 "v1.6.1"
- **Previous Commit**: 7062789 "Update claude.md to reflect fixed critical bugs"

## Summary

Fetchfully is a well-architected, type-safe HTTP client that strikes a good balance between simplicity and functionality. The codebase is clean, modular, and follows solid separation of concerns. At under 900 lines, it remains lightweight while providing significant value over the native Fetch API.

The library demonstrates good TypeScript practices, thoughtful API design focused on developer experience, and a clear architectural vision. Critical bugs identified during initial analysis have been fixed in the `bug-fixes` branch. With the addition of automated tests, the library would be production-ready for most use cases.
