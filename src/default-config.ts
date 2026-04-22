import { FetchfullyConfig } from "./types";

/* ----------------------------------------------------- */

// Default request configuration
export const defaultConfig: FetchfullyConfig = {
  method: "GET",
  credentials: "same-origin",
  keepalive: false,
  mode: "cors",
  queryArrayFormat: "comma",
  timeout: 0,
  retries: 0,
  retryDelay: 1000,
  headers: {
    "Content-Type": "application/json",
    "Cache-Control": "no-cache",
  },
};
