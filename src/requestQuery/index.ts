import dataByContentType from "../data-by-content-type";

/* ------------------------------------------------------ */

type DataByContentTypeProps = {
  data: Promise<any>;
  responseObject: Response;
};

/**
 * Handles all non-mutation request (GET) cases.
 *
 * @param response Response: Fetch API response interface to a request.
 *
 * @returns Promise<any>
 */
export default function requestQuery(
  response: Response
): DataByContentTypeProps {

  if (!response.ok) {
    const errorData = {
      error: "REQUEST ERROR",
      status: response.status,
      responseObject: response,
    };

    throw new Error(JSON.stringify(errorData));
  }

  return dataByContentType(response);
}
