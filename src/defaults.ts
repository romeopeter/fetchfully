import { FetchfullyConfig } from "./types/config";

export const defaults: FetchfullyConfig = {
  method: "GET",
  credentials: "same-origin",
  keepalive: false,
  mode: "cors",
  customOptions: {
    responseBodyType: "json",
    timeout: 5000,
  },
  queryOptions: {
    arrayFormat: "none",
  },
};