import { FetchfullyConfig } from "./types/config";

/* ----------------------------------------------------- */

// Default request configuration 
export const defaults: FetchfullyConfig = {
  method: "GET",
  credentials: "same-origin",
  keepalive: false,
  mode: "cors",
  queryArrayFormat: "comma",
  timeout: 0,
};