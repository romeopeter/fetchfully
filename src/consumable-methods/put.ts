import type {
  FetchfullyInstance,
  FetchfullyResponse,
  RequestOptions,
} from "../types";

/* ------------------------------------------------- */

export function createPutMethod(instance: FetchfullyInstance) {
  return async function put<T = any>(
    path: string,
    data?: any,
    query?: Record<string, any>,
    options?: RequestOptions
  ): Promise<FetchfullyResponse<T>> {
    return instance<T>({
      ...options,
      path,
      method: "PUT",
      body: data,
      query,
    });
  };
}
