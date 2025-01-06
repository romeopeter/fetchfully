import { FetchfullyInstance } from "../types/config";

/* ------------------------------------------------- */

export function createPatchMethod(instance: FetchfullyInstance) {
    return async function patch<T = any>(
      path: string, 
      data?: any, 
      query?: Record<string, any>
    ): Promise<T> {
      return instance({
        path,
        method: 'PATCH',
        body: data,
        query
      });
    };
  }