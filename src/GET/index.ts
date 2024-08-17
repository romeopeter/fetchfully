/**
 * Handles all GET request cases
 *
 * @param response Response: Fetch API response interface to a request.
 *
 * @returns Promise<any>
 */
export default function GETRequest(response: Response) {
  const contentType = response.headers.get("Content-Type") as string;

  if (!response.ok) {
    const errorDate = {
      error: `HTTP error! status: ${response.status}`,
      response: response,
    };

    throw new Error(JSON.stringify(errorDate));
  }

  if (contentType.includes("application/json")) {
    return response.json();
  }

  if (contentType.includes("application/octet-stream")) {
    response.arrayBuffer();
  }

  if (contentType.includes("multipart/form-data")) {
    return response.formData();
  }

  if (contentType.includes("image/")) {
    return response.blob();
  }

  // Default response to text if content type is unknown
  return response.text();
}
