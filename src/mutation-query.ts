import filterByContentType from "./utils/filter-by-content-type";
import { successResponse, errorResponse, type ParsedResponse } from "./response";
import { HttpError } from "./utils/custom-request-errors";
/* ---------------------------------------------------------------------- */

/**
 * Handles all mutation requests (POST, PUT, PATCH, DELETE) cases
 *
 * Success is any 2xx status, plus 304 (Not Modified). Typical codes:
 * - POST/PUT: 200 (OK) or 201 (Created).
 * - PATCH: 200 (OK) or 204 (No Content); 304 when nothing changed.
 * - DELETE: 200 (OK) with a body, 202 (Accepted) when not yet enacted,
 *   or 204 (No Content) when enacted with nothing more to say.
 *
 * Everything else (4xx, 5xx, other 3xx, opaque responses) is an HttpError.
 *
 * @param response Response: Fetch API response interface to a request.
 *
 * @returns Promise<ParsedResponse>
 */
export default async function mutationQuery(
  originResponse: Response
): Promise<ParsedResponse> {
  const { status, statusText, url, headers } = originResponse;

  if (originResponse.ok || status === 304) {
    const data = await filterByContentType(originResponse);
    return successResponse(data, status, headers);
  }

  return errorResponse(new HttpError(status, statusText, url), status, headers);
}
