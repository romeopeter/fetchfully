import { FetchfullyInstance } from "../types/config";
import {FetchfullyResponse} from "../types/fetchfully-response"

/* ------------------------------------------------- */

export function createGetMethod(instance: FetchfullyInstance) {
  return async function get<T = any>(
    path: string,
    query?: Record<string, any>
  ): Promise<FetchfullyResponse<T>> {
    return instance({
      path,
      method: "GET",
      query,
    });
  };
}
