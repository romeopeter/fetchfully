import { defaults } from "./defaults";
import { createFetcher } from "./fetcher";
import type { FetchfullyConfig, FetchfullyInstance } from "./types/config";
import { mergeConfig } from "./utils/mergeConfig";

/* ---------------------------------------------------------------------------------- */

const defaultFetchfullyInstance = createFetcher(defaults) as FetchfullyInstance;

// Factory method to produce a new fetcher instance
defaultFetchfullyInstance.create = (config?: FetchfullyConfig) => {
  const instanceConfig = mergeConfig(defaults, config || {});

  return createFetcher(instanceConfig) as FetchfullyInstance;
};

export default defaultFetchfullyInstance
