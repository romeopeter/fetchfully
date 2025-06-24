import filterByContentType from "./utils/filter-by-content-type";
import { HttpError } from "./utils/custom-request-errors";
import fetchfullyResponse from "./response";
import { FetchfullyConfig } from "./types/config";
import { FetchfullyResponse } from "./types/fetchfully-response";

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
export default function requestQuery(
  originResponse: Response,
  refetch?: Override
) {
  let response = fetchfullyResponse(
    "loading",
    null,
    null,
    undefined,
    undefined
  );

  if (originResponse.ok) {
    const data = filterByContentType(originResponse);

    response = fetchfullyResponse(
      "success",
      data,
      null,
      originResponse.status,
      originResponse.headers,
      refetch
    );
  } else {
    throw new HttpError(
      response.status,
      originResponse.statusText,
      originResponse.url
    );
  }

  return response;
}
