import { FetchfullyInstance } from "../types/config";
import {FetchfullyResponse} from "../types/fetchfully-response"

/* ------------------------------------------------- */

export function createPatchMethod(instance: FetchfullyInstance) {
    return async function patch<T = any>(
      path: string, 
      data?: any, 
      query?: Record<string, any>
    ): Promise<FetchfullyResponse<T>> {
      return instance({
        path,
        method: 'PATCH',
        body: data,
        query
      });
    };
  }