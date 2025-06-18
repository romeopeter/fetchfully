import { FetchfullyInstance } from "../types/config";
import {FetchfullyResponse} from "../types/fetchfully-response"

/* ------------------------------------------------- */

export function createDeleteMethod(instance: FetchfullyInstance) {
  return async function del<T = any>(
    path: string,
    query?: Record<string, any>
  ): Promise<FetchfullyResponse<T>> {
    return instance({
      path,
      method: "DELETE",
      query,
    });
  };
}
