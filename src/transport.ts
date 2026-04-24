export interface TransportRequestOptions {
  method: "GET" | "POST" | "DELETE" | "PUT" | "PATCH";
  url: string;
  headers?: Record<string, string>;
  params?: Record<string, string>;
  body?: unknown;
  timeout?: number;
}

export interface TransportResponse<T = unknown> {
  data: T;
  status: number;
  headers: globalThis.Headers;
}

export interface HttpTransport {
  request<T = unknown>(
    options: TransportRequestOptions,
  ): Promise<TransportResponse<T>>;
  get<T = unknown>(
    url: string,
    options?: Omit<TransportRequestOptions, "method" | "url" | "body">,
  ): Promise<TransportResponse<T>>;
  post<T = unknown>(
    url: string,
    body?: unknown,
    options?: Omit<TransportRequestOptions, "method" | "url" | "body">,
  ): Promise<TransportResponse<T>>;
  delete<T = unknown>(
    url: string,
    options?: Omit<TransportRequestOptions, "method" | "url" | "body">,
  ): Promise<TransportResponse<T>>;
}
