// This module convert request headers properties to the right casing, key and values.

/* ------------------------------------------------------------------------------------ */

/**
 * Convert request headers properties from camelCase actual headers key format.
 * 
 * @param camelCaseHeaders Record<string, any>: Object of camelCase request headers
 * @returns Record<string, any>: Object of camelCase request headers
 */
export function requestHeadersFormatter(camelCaseHeaders: Record<string, any> | undefined) {
  if (camelCaseHeaders === undefined) return

  const formattedHeaders: Record<string, any> = {};
  const headersKeys = Object.keys(camelCaseHeaders);

  const camelCaseToHeader = (str: string) => {
    return str
      .replace(/([A-Z])/g, "-$1")
      .replace(/^-/, "")
      .toLowerCase()
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join("-"); // eg: contentType -> "Content-Type"
  };

  for (let key of headersKeys) {
    const formatHeaderCasing = camelCaseToHeader(key);
    formattedHeaders[formatHeaderCasing] = camelCaseHeaders[key];
  }

  return formattedHeaders;
}
