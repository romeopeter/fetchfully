import type {
  FetchfullyInstance,
  FetchfullyResponse,
  RequestOptions,
} from "../types";

/* ------------------------------------------------- */

export function createDeleteMethod(instance: FetchfullyInstance) {
  return async function del<T = any>(
    path: string,
    query?: Record<string, any>,
    options?: RequestOptions
  ): Promise<FetchfullyResponse<T>> {
    return instance<T>({
      ...options,
      path,
      method: "DELETE",
      query,
    });
  };
}
