import { FetchfullyConfig } from "./types/config";

/* ----------------------------------------------------- */

// Default request configuration
export const defaultConfig: FetchfullyConfig = {
  method: "GET",
  credentials: "same-origin",
  keepalive: false,
  mode: "cors",
  queryArrayFormat: "comma",
  timeout: 0,
  headers: {
    "Content-Type": "application/json",
    "Cache-Control": "no-cache",
  },
};
