import filterByContentType from "./utils/filter-by-content-type";
import fetchfullyResponse from "./response";
import { HttpError } from "./utils/custom-request-errors";
import { FetchfullyConfig } from "./types/config";
import { FetchfullyResponse } from "./types/fetchfully-response";

/* ---------------------------------------------------------------------- */

/**
 * Handles all mutation requests (POST, PUT, PATCH, DELETE) cases
 *
 * @param response Response: Fetch API response interface to a request.
 *
 * @returns Promise<any>
 */
export default async function mutationQuery(
  originResponse: Response,
  refetch?: (
    override?: Partial<FetchfullyConfig>
  ) => Promise<FetchfullyResponse>
) {
  let response = fetchfullyResponse(
    "loading",
    null,
    null,
    undefined,
    undefined
  );

  // Server error
  if (originResponse.status > 499 && originResponse.status <= 599) {
    throw new HttpError(
      originResponse.status,
      originResponse.statusText,
      originResponse.url
    );
  }

  // Client error
  if (originResponse.status > 399 && originResponse.status <= 499) {
    throw new HttpError(
      originResponse.status,
      originResponse.statusText,
      originResponse.url
    );
  }

  /**
   * POST/PUT
   *
   * - 200 (OK) or 201 (created).
   *
   */
  if (originResponse.status === 200 || originResponse.status === 201) {
    const data = await filterByContentType(originResponse);

    console.log(data);

    response = fetchfullyResponse(
      "success",
      data,
      null,
      originResponse.status,
      originResponse.headers,
      refetch
    );
  }

  /**
   * PATCH
   *
   * For a successful PATCH, common status codes would likely be:
   * - 200 (OK) or 204 (No Content).
   * If the PATCH method was unsuccessful, status codes such as 304 (Not Modified), 400 (Bad Request),
   * or 422 (Unprocessable Entity) may be seen. This is already handled above!
   */
  if (originResponse.status === 204 || originResponse.status === 304) {
    const data = await filterByContentType(originResponse);

    console.log(data);

    response = fetchfullyResponse(
      "success",
      data,
      null,
      originResponse.status,
      originResponse.headers,
      refetch
    );
  }

  /**
   * DELETE
   *
   * If a DELETE method is successfully applied, there are several response status codes possible:
   * - 202 (Accepted) status code if the action will likely succeed but has not yet been enacted.
   * - 204 (No Content) status code if the action has been enacted and no further information is to be supplied.
   * - 200 (OK) status code if the action has been enacted and the response message includes a representation describing the status.
   */
  if (originResponse.status === 202 || originResponse.status === 204) {
    const data = await filterByContentType(originResponse);

    response = fetchfullyResponse(
      "success",
      data,
      null,
      originResponse.status,
      originResponse.headers,
      refetch
    );
  }

  return response;
}
