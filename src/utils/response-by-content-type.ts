import { ResponseByContentTypeProps } from "../types";

/* ------------------------------------------------------*/

/**
 * Returns formatted data according to response content type.
 *
 * @param response: Response
 * @returns Promise<ResponseByContentTypeProps>
 */
export default async function responseByContentType(
  response: Response
): Promise<ResponseByContentTypeProps> {
  const contentType = response.headers.get("Content-Type") as string;

  if (contentType.includes("application/json")) {
    const data = await response.json();

    return {
      data: data,
      _responseObject: response,
    };
  }

  if (contentType.includes("application/octet-stream")) {
    const data = await response.arrayBuffer();

    return {
      data: data,
      _responseObject: response,
    };
  }

  if (contentType.includes("multipart/form-data")) {
    const data = await response.formData();

    return {
      data: data,
      _responseObject: response,
    };
  }

  if (contentType.includes("image/")) {
    const data = await response.blob();

    return {
      data: data,
      _responseObject: response,
    };
  }

  // Default response as text if content type is unknown
  return {
    data: await response.text(),
    _responseObject: response,
  };
}
