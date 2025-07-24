// All types
export type {
  RequestStatus,
  RequestHeaders,
  FetchfullyConfig,
  FetchfullyResponse,
  FetchfullyInstance,
} from "./types";

// Main implementation
export { default as fetcher } from "./fetchfully";
export { default as http } from "./fetchfully";
export { default } from "./fetchfully";

// Named exports for convenience
/*export { 
  fetchfully as fetcher,
  fetchfully as http 
} from './fetchfully';*/