import type { FetchfullyConfig, RequestHeaders } from "../types";

// Header names are case-insensitive: a source header replaces any target
// header with the same name in another spelling, so `content-type` set on a
// call replaces the default `Content-Type` instead of being sent beside it
const mergeHeaders = (
  target: RequestHeaders,
  source: RequestHeaders
): RequestHeaders => {
  const replaced = new Set(Object.keys(source).map((name) => name.toLowerCase()));
  const kept = Object.entries(target).filter(
    ([name]) => !replaced.has(name.toLowerCase())
  );

  return { ...Object.fromEntries(kept), ...source };
};

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
      if (key === "headers" && isObject(source.headers) && isObject(target.headers)) {
        target.headers = mergeHeaders(target.headers, source.headers);
      } else if (
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