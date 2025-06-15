/**
 * Returns formatted data according to response content type.
 *
 * @param response: Response
 * @returns Promise<any>
 */
export default async function responseByContentType(response: Response) {
  const contentType = response.headers.get("Content-Type") as string;

  if (contentType.includes("application/json")) return await response.json();

  if (contentType.includes("application/octet-stream")) {
    return await response.arrayBuffer();
  }

  if (contentType.includes("multipart/form-data")) {
    return await response.formData();
  }

  if (contentType.includes("image/")) return await response.blob();

  // if content type is unknown
  return response.text();
}