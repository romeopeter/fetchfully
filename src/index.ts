// All types
export type {
  RequestStatus,
  RequestHeaders,
  FetchfullyConfig,
  FetchfullyResponse,
  FetchfullySuccessResponse,
  FetchfullyErrorResponse,
  FetchfullyInstance,
  RequestOptions,
  Query,
  QueryState,
  QueryListener,
  QueryFetcher,
} from "./types";

// Main implementation
export { default as Fetchfully } from "./fetchfully";
export { default as Http } from "./fetchfully";

// Framework-agnostic observable request state
export { createQuery } from "./query";

// Error classes, for `res.error instanceof HttpError` and similar checks
export {
  NetworkError,
  HttpError,
  CorsError,
  TimeoutError,
  CancelError,
} from "./utils/custom-request-errors";