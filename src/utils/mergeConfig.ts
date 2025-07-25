import { FetchfullyConfig } from "../types";

/**
 * Merges instance-specific config to default config.
 * Preserve all default config unless overridden by instance-specific config
 *
 * @param defaultConfig Generic type of T
 * @param instanceConfig Generic type of T
 *
 * @returns Generic type of T
 */
export function mergeConfig(
  defaultConfig: FetchfullyConfig,
  instanceConfig: Partial<FetchfullyConfig>
): FetchfullyConfig {
  const isObject = (obj: any): obj is Record<string, any> =>
    obj instanceof Object && !Array.isArray(obj);

  const merge = (
    target: FetchfullyConfig,
    source: Partial<FetchfullyConfig>
  ): FetchfullyConfig => {
    for (const key in source) {
      if (
        isObject(source[key as keyof Partial<FetchfullyConfig>]) &&
        isObject(target[key as keyof FetchfullyConfig])
      ) {
        // Recursively merge nested objects
        //@ts-ignore
        target[key as keyof FetchfullyConfig] = merge(
          //@ts-ignore
          { ...target[key as keyof FetchfullyConfig] },
          //@ts-ignore
          source[key as keyof Partial<FetchfullyConfig>]
        );
      } else {
        // Override or add property
        //@ts-ignore
        target[key as keyof FetchfullyConfig] =
          source[key as keyof Partial<FetchfullyConfig>];
      }
    }
    return target;
  };

  return merge({ ...defaultConfig }, instanceConfig);
}