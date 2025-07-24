import { defaultConfig } from "./default-config";
import { createFetch } from "./engine";
import { FetchfullyInstance, FetchfullyConfig } from "./types";
import { mergeConfig } from "./utils/mergeConfig";

/* ------------------------------------------------------------------------- */

const fetchfully = createFetch(defaultConfig) as FetchfullyInstance;

// Factory method to produce a new fetcher instance
fetchfully.create = (config?: FetchfullyConfig) => {
  const instanceFactoryConfig = mergeConfig(defaultConfig, config || {});

  return createFetch(instanceFactoryConfig) as FetchfullyInstance;
};

export default fetchfully as FetchfullyInstance
