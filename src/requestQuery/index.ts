import responseByContentType from "../response-by-content-type";
import { ResponseByContentTypeProps } from "../types";

/* ------------------------------------------------------ */

/**
 * Handles all non-mutation request (GET) cases.
 *
 * @param response Response: Fetch API response interface to a request.
 *
 * @returns Promise<any>
 */
export default function requestQuery(
  response: Response
): ResponseByContentTypeProps {

  if (!response.ok) {
    const errorData = {
      error: "REQUEST ERROR",
      status: response.status,
      responseObject: response,
    };

    throw new Error(JSON.stringify(errorData));
  }

  return responseByContentType(response);
}
