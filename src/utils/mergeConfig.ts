import { FetchfullyConfig } from "../types/config";

/**
 * Default and Instance-specific configuration merging function
 *
 * @param defaultConfig FetchfullyConfig
 * @param instanceConfig FetchfullyConfig
 *
 * @returns FetchfullyConfig
 */
export function mergeConfig(
  defaultConfig: FetchfullyConfig,
  instanceConfig: FetchfullyConfig
) {
  const config: FetchfullyConfig = {};

  // Merge headers
  config.headers = {
    ...defaultConfig.headers,
    ...instanceConfig.headers,
  };

  //   Merge other properties. Instance properties take precedence
  Object.keys(instanceConfig).forEach((key) => {
    if (key !== "headers") {
      config[key as keyof FetchfullyConfig] =
        instanceConfig[key as keyof FetchfullyConfig];
    }
  });

  return config;
}
