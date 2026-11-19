import filterByContentType from "./utils/filter-by-content-type";
import { HttpError } from "./utils/custom-request-errors";
import { successResponse, errorResponse, type ParsedResponse } from "./response";

/* ------------------------------------------------------ */

/**
 * Handles all non-mutation request (GET) cases.
 *
 * Success is any 2xx status. Everything else is an HttpError, and its body
 * isn't read.
 *
 * @param originResponse Response: Fetch API response interface for a request.
 * @returns Promise<ParsedResponse>
 */
export default async function requestQuery(
  originResponse: Response
): Promise<ParsedResponse> {
  const { status, statusText, url, headers } = originResponse;

  if (originResponse.ok) {
    const data = await filterByContentType(originResponse);
    return successResponse(data, status, headers);
  }

  return errorResponse(new HttpError(status, statusText, url), status, headers);
}
