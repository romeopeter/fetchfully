type DataByContentTypeProps = {
    data: Promise<any>;
    responseObject: Response;
}

/**
 * Returns formatted data according to response content type.
 * 
 * @param response: Response
 * @returns DataByContentTypeProps
 */
export default function dataByContentType(response: Response): DataByContentTypeProps {
  const contentType = response.headers.get("Content-Type") as string;

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

  // Default response as text if content type is unknown
  return {
    data: response.text(),
    responseObject: response,
  };
}
