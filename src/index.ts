// All types
export type {
  RequestStatus,
  RequestHeaders,
  FetchfullyConfig,
  FetchfullyResponse,
  FetchfullySuccessResponse,
  FetchfullyErrorResponse,
  FetchfullyInstance,
  FetchfullyDefaultInstance,
  RequestOptions,
  RequestBody,
  Query,
  QueryState,
  QueryListener,
  QueryFetcher,
  QueryGroup,
  QueryGroupState,
  QueryGroupData,
  QueryGroupListener,
  CacheOptions,
  FetchfullyCache,
  InvalidateTarget,
} from "./types";

// Main implementation
export { default as Fetchfully } from "./fetchfully";
export { default as Http } from "./fetchfully";

// Framework-agnostic observable request state
export { createQuery } from "./query";
export { combineQueries } from "./combine-queries";

// Error classes, for `res.error instanceof HttpError` and similar checks
export {
  NetworkError,
  HttpError,
  CorsError,
  TimeoutError,
  CancelError,
} from "./utils/custom-request-errors";