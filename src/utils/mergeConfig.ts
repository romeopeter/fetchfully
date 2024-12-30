import { FetchfullyConfig } from "../types/config";

/**
 * Merges instance-specific config to default config.
 * Preserve all default config unless overridden by instance-specific config
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

  Object.keys(defaultConfig).forEach((key) => {
    if (
      defaultConfig[key as keyof FetchfullyConfig] instanceof Object &&
      !Array.isArray(key as keyof FetchfullyConfig)
    ) {
      config[key as keyof FetchfullyConfig] = mergeConfig(
        defaultConfig[key as keyof FetchfullyConfig] || {},
        instanceConfig[key as keyof FetchfullyConfig]
      );
    } else {
      config[key as keyof FetchfullyConfig] =
        instanceConfig[key as keyof FetchfullyConfig];
    }
  });

  return config;
}