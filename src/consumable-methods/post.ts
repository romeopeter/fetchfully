import type {
  FetchfullyInstance,
  FetchfullyResponse,
  RequestOptions,
} from "../types";

/* ------------------------------------------------- */

export function createPostMethod(instance: FetchfullyInstance) {
  return async function post<T = any>(
    path: string,
    data?: any,
    query?: Record<string, any>,
    options?: RequestOptions
  ): Promise<FetchfullyResponse<T>> {
    return instance<T>({
      ...options,
      path,
      method: "POST",
      body: data,
      query,
    });
  };
}
