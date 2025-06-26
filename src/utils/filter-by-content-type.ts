/**
 * Consume request response data by content type.
 *
 * @param originResponse: Response
 * @returns Promise<any>
 */
export default async function filterByContentType(originResponse: Response) {
  const contentType = originResponse.headers.get("Content-Type") as string;
  let data: string | FormData | ArrayBuffer | Blob;

  if (contentType?.includes("application/json")) {
    data = await originResponse.json();
  } else if (contentType?.includes("application/octet-stream")) {
    data = await originResponse.arrayBuffer();
  } else if (contentType?.includes("multipart/form-data")) {
    data = await originResponse.formData();
  } else if (contentType?.includes("image/")) {
    data = await originResponse.blob();
  } else {
    // Default case: read as text
    data = await originResponse.text();
  }

  return data;
}
