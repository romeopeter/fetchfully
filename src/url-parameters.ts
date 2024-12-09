/**
 * Constructs query string from an object of query parameters
 * @param queryParams Object containing query parameters
 * @returns Formatted query string
 */
function constructQueryString(queryParams: Record<string, any>) {
  if (!queryParams || Object.keys(queryParams).length === 0) return "";

  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(queryParams)) {
    if (value === null || value === undefined) return "";
    // Arrays
    else if (Array.isArray(value)) {
      value.forEach((item) => searchParams.append(`${key}[]`, String(item)));
    }

    // Handle objects (convert to JSON string)
    else if (typeof value === "object") {
      searchParams.append(key, JSON.stringify(value));
    } else {
      searchParams.append(key, String(value));
    }
  }

  return `?${searchParams.toString()}`;
}

/**
 * Constructs full URL by combining base URL with path parameters
 *
 * @param baseUrl The base URL
 * @param path Optional path parameter(s)
 * @param queryParams URL query parameter(s)
 * @returns Constructed URL string
 *
 */
export function constructUrl(
  baseUrl: string,
  path: string[] | string | undefined,
  queryParams: Record<string, any>
) {
  const cleanBaseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;

  let urlHasPath = cleanBaseUrl;

  // Array of paths segment
  if (path) {
    const pathSegment = Array.isArray(path)
      ? path
          .map((segment) => encodeURIComponent(segment.toString().trim()))
          .join("/")
      : encodeURIComponent(path.toString().trim());

    urlHasPath = `${cleanBaseUrl}/${pathSegment}`;
  }

  // URL with queries
  const queryString = constructQueryString(queryParams);

  return urlHasPath ? `${urlHasPath}/${queryString}` : cleanBaseUrl;
}
