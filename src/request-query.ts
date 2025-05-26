import responseByContentType from "./utils/response-by-content-type";
import { ResponseByContentType } from "./types/request-response-by-content";
import { HttpError } from "./utils/custom-request-errors";

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
): Promise<ResponseByContentType> {
  if (!response.ok) {
    throw new HttpError(response.status, response.statusText, response.url);
  }

  return responseByContentType(response);
}
