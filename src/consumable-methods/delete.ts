import { FetchfullyInstance } from "../types/config";

/* ------------------------------------------------- */

export function createDeleteMethod(instance: FetchfullyInstance) {
  return async function del<T = any>(
    path: string,
    query?: Record<string, any>
  ): Promise<T> {
    return instance({
      path,
      method: "DELETE",
      query,
    });
  };
}
