import { FetchfullyInstance } from "../types/config";

/* ------------------------------------------------- */

export function createGetMethod(instance: FetchfullyInstance) {
  return async function get<T = any>(
    path: string,
    query?: Record<string, any>
  ): Promise<T> {
    return instance({
      path,
      method: "GET",
      query,
    });
  };
}
