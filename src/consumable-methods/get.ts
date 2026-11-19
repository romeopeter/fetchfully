import type {
  FetchfullyInstance,
  FetchfullyResponse,
  RequestOptions,
} from "../types";

/* ------------------------------------------------- */

export function createGetMethod(instance: FetchfullyInstance) {
  return async function get<T = any>(
    path: string,
    query?: Record<string, any>,
    options?: RequestOptions
  ): Promise<FetchfullyResponse<T>> {
    return instance<T>({
      ...options,
      path,
      method: "GET",
      query,
    });
  };
}
