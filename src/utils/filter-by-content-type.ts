/**
 * Returns formatted data according to response content type.
 *
 * @param response: Response
 * @returns Promise<any>
 */
export default async function filterByContentType(originResponse: Response) {
  const contentType = originResponse.headers.get("Content-Type") as string;

  if (contentType.includes("application/json"))
    return await originResponse.json();

  if (contentType.includes("application/octet-stream")) {
    return await originResponse.arrayBuffer();
  }

  if (contentType.includes("multipart/form-data")) {
    return await originResponse.formData();
  }

  if (contentType.includes("image/")) return await originResponse.blob();

  // if content type is unknown
  return await originResponse.text();
}
