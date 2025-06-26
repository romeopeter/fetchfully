import { FetchfullyInstance } from "../types/config";
import { FetchfullyResponse } from "../types/fetchfully-response";

/* ------------------------------------------------- */

export function createPostMethod(instance: FetchfullyInstance) {
  return async function post<T = any>(
    path: string,
    data?: any,
    query?: Record<string, any>
  ): Promise<FetchfullyResponse<T>> {
    return instance({
      path,
      method: "POST",
      body: data,
      query,
    });
  };
}
