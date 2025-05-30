import responseByContentType from "./utils/response-by-content-type";
import { ResponseByContentType } from "./types/request-response-by-content";
import { HttpError } from "./utils/custom-request-errors";

/* ---------------------------------------------------------------------- */

/**
 * Handles all mutation requests (POST, PUT, PATCH, DELETE) cases
 *
 * @param response Response: Fetch API response interface to a request.
 *
 * @returns Promise<any>
 */
export default function mutationQuery(
  response: Response
): Promise<ResponseByContentType> | undefined {
  // Server error
  if (response.status > 499 && response.status <= 599) {
    throw new HttpError(response.status, response.statusText, response.url);
  }

  // Client error
  if (response.status > 399 && response.status <= 499) {
    throw new HttpError(response.status, response.statusText, response.url);
  }

  /**
   * POST/PUT
   *
   * - 200 (OK) or 201 (created).
   *
   */
  if (response.status === 200 || response.status === 201) {
    return responseByContentType(response);
  }

  /**
   * PATCH
   *
   * For a successful PATCH, common status codes would likely be:
   * - 200 (OK) or 204 (No Content).
   * If the PATCH method was unsuccessful, status codes such as 304 (Not Modified), 400 (Bad Request),
   * or 422 (Unprocessable Entity) may be seen. This is already handled above!
   */
  if (
    response.status === 200 ||
    response.status === 204 ||
    response.status === 304
  ) {
    return responseByContentType(response);
  }

  /**
   * DELETE
   *
   * If a DELETE method is successfully applied, there are several response status codes possible:
   * - 202 (Accepted) status code if the action will likely succeed but has not yet been enacted.
   * - 204 (No Content) status code if the action has been enacted and no further information is to be supplied.
   * - 200 (OK) status code if the action has been enacted and the response message includes a representation describing the status.
   */
  if (
    response.status == 200 ||
    response.status === 202 ||
    response.status === 204
  ) {
    return responseByContentType(response);
  }
}
