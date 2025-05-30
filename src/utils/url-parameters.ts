type QueryOptions = {
  query?: Record<string, any>;
  queryArrayFormat?: "brackets" | "comma" | "repeat" | "none";
};

/**
 * Constructs query string from an object of query parameters
 * @param queryParams Object containing query parameters
 * @returns Formatted query string
 */
function constructQueryString(
  query: Record<string, any>,
  queryArrayFormat?: "brackets" | "comma" | "repeat" | "none"
) {
  if (!query || Object.keys(query).length === 0) return "";

  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value === null || value === undefined) return;

    // Arrays
    if (Array.isArray(value)) {
      switch (queryArrayFormat) {
        case "brackets":
          // format: colors[]=red&colors[]=blue
          value.forEach((item) =>
            searchParams.append(`${key}[]`, String(item))
          );
          break;

        case "comma":
          // format: colors=red,blue
          searchParams.append(key, value.join(","));
          break;

        case "repeat":
          // format: colors=red&colors=blue
          value.forEach((item) => searchParams.append(key, String(item)));
          break;

        // format: colors=red blue
        case "none":
        default:
          searchParams.append(key, value.join(" "));
          break;
      }
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
 * Constructs full URL by combining supplied  with path parameters
 *
 * @param baseUrl The url
 * @param path Optional path parameter(s)
 * @param queryParams URL query parameter(s)
 * @returns Constructed URL string
 *
 */
export function constructUrl(
  url: string,
  path?: string[] | string | undefined,
  queryOptions?: QueryOptions
) {
  //  Remove extra slash from base path.
  const cleanBaseUrl = url.endsWith("/") ? url.slice(0, -1) : url;

  let urlWithPaths = cleanBaseUrl;

  if (path) {
    const pathSegment = Array.isArray(path)
      ? path
          .map((segment) => segment.toString().trim())
          .join("/")
      : path.toString().trim();

    urlWithPaths = `${cleanBaseUrl}/${pathSegment}`;
  }

  if (queryOptions?.query) {
    const queryString = constructQueryString(
      queryOptions.query,
      queryOptions.queryArrayFormat
    );
    return urlWithPaths ? `${urlWithPaths}/${queryString}` : cleanBaseUrl;
  }

  return urlWithPaths ? urlWithPaths : cleanBaseUrl;
}
