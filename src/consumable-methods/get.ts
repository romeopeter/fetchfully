import { FetchfullyInstance, FetchfullyResponse } from "../types";

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
