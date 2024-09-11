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
    const errorData = {
      error: `HTTP error! status: ${response.status}`,
      responseObject: response,
    };

    throw new Error(JSON.stringify(errorData));
  }

  if (contentType.includes("application/json")) {
    return {
      data: response.json(),
      responseObject: response,
    };
  }

  if (contentType.includes("application/octet-stream")) {
    return {
      data: response.arrayBuffer(),
      responseObject: response,
    };
  }

  if (contentType.includes("multipart/form-data")) {
    return {
      data: response.formData(),
      responseObject: response,
    };
  }

  if (contentType.includes("image/")) {
    return {
      data: response.blob(),
      responseObject: response,
    };
  }

  // Default response to text if content type is unknown
  return {
    data: response.text(),
    responseObject: response,
  };
}
