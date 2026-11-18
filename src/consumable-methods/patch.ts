import type {
  FetchfullyInstance,
  FetchfullyResponse,
  RequestOptions,
} from "../types";

/* ------------------------------------------------- */

export function createPatchMethod(instance: FetchfullyInstance) {
  return async function patch<T = any>(
    path: string,
    data?: any,
    query?: Record<string, any>,
    options?: RequestOptions
  ): Promise<FetchfullyResponse<T>> {
    return instance<T>({
      ...options,
      path,
      method: "PATCH",
      body: data,
      query,
    });
  };
}
