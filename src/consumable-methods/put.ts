import { FetchfullyInstance } from "../types/config";

/* ------------------------------------------------- */

export function createPutMethod(instance: FetchfullyInstance) {
  return async function put<T = any>(
    path: string,
    data?: any,
    query?: Record<string, any>
  ): Promise<T> {
    return instance({
      path,
      method: "PUT",
      body: data,
      query,
    });
  };
}
