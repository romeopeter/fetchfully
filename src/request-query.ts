import filterByContentType from "./utils/filter-by-content-type";
import { HttpError } from "./utils/custom-request-errors";
import { successResponse, errorResponse } from "./response";
import { type FetchfullyConfig, type FetchfullyResponse } from "./types";

/* ------------------------------------------------------ */

type Override = (
  override?: Partial<FetchfullyConfig>
) => Promise<FetchfullyResponse>;

/**
 * Handles all non-mutation request (GET) cases.
 *
 * @param response Response: Fetch API response interface for a request.
 * @param refetch Override: Re-execute user query
 * @returns FetchfullyResponse<any>
 */
export default async function requestQuery(
  originResponse: Response,
  refetch?: Override
): Promise<FetchfullyResponse> {
  const { status, statusText, url, headers } = originResponse;

  if (originResponse.ok) {
    const data = await filterByContentType(originResponse);
    return successResponse(data, status, headers, refetch);
  }

  return errorResponse(
    new HttpError(status, statusText, url),
    status,
    headers,
    refetch
  );
}
