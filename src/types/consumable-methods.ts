export interface RequestMethods {
  get<T = any>(path: string, query?: Record<string, any>): Promise<T>;
  post<T = any>(path: string, data?: any, query?: Record<string, any>): Promise<T>;
  put<T = any>(path: string, data?: any, query?: Record<string, any>): Promise<T>;
  patch<T = any>(path: string, data?: any, query?: Record<string, any>): Promise<T>;
  delete<T = any>(path: string, query?: Record<string, any>): Promise<T>;
}