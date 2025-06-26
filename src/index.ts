import { defaultConfig } from "./default-config";
import { createFetcher } from "./fetcher";
import type { FetchfullyConfig, FetchfullyInstance } from "./types/config";
import { mergeConfig } from "./utils/mergeConfig";

/* ---------------------------------------------------------------------------------- */

const defaultFetchfullyInstance = createFetcher(
  defaultConfig
) as FetchfullyInstance;

// Factory method to produce a new fetcher instance
defaultFetchfullyInstance.create = (config?: FetchfullyConfig) => {
  const instanceFactoryConfig = mergeConfig(defaultConfig, config || {});

  return createFetcher(instanceFactoryConfig) as FetchfullyInstance;
};

export default defaultFetchfullyInstance;
