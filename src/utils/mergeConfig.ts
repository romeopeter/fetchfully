import { FetchfullyConfig } from "../types/config";

/**
 * Merges core config with Instance-specific config
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

  // Merge default and instance headers
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
