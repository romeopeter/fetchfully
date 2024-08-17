import { FetchAPIPropsType } from "./types";
import GETRequest from "./GET";

/* ------------------------------------------------------------------------------------ */

const responseFormat = [
  "text",
  "json",
  "formData",
  "blob",
  "arrayBuffer",
  "body",
];

export default async function fetcher({
  URL = "https://api.github.com/repos/javascript-tutorial/en.javascript.info/commits",
  method = "GET",
  body,
  headers,
  credentials = "same-origin",
  keepalive = false,
  mode = "cors",
  customOptions,
}: FetchAPIPropsType): Promise<string | any> {
  try {
    const response = await fetch(`${URL}`, {
      method,
      body,
      headers,
      credentials,
      keepalive,
      mode,
    });

    if (method !== "GET") {
      // Request other than a GET
      // ...
    }

    // GET Requests
    GETRequest(response);
  } catch (error) {
    console.log(error);
  }
}
