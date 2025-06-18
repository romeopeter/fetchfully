import { FetchfullyResponse } from "./fetchfully-response";

/* ------------------------------------------------------------- */

export interface RequestMethods {
  get<T = any>(
    path: string,
    query?: Record<string, any>
  ): Promise<FetchfullyResponse<T>>;
  post<T = any>(
    path: string,
    data?: any,
    query?: Record<string, any>
  ): Promise<FetchfullyResponse<T>>;
  put<T = any>(
    path: string,
    data?: any,
    query?: Record<string, any>
  ): Promise<FetchfullyResponse<T>>;
  patch<T = any>(
    path: string,
    data?: any,
    query?: Record<string, any>
  ): Promise<FetchfullyResponse<T>>;
  delete<T = any>(
    path: string,
    query?: Record<string, any>
  ): Promise<FetchfullyResponse<T>>;
}
