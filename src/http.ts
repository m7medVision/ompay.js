import type {
  HttpTransport,
  TransportRequestOptions,
  TransportResponse,
} from "./transport.js";

export type HttpRequestOptions = TransportRequestOptions;

export type HttpResponse<T = unknown> = TransportResponse<T>;

export class HttpError extends Error {
  readonly status: number;
  readonly data: unknown;
  readonly headers: globalThis.Headers;

  constructor(status: number, data: unknown, headers: globalThis.Headers) {
    super(`Request failed with status code ${status}`);
    this.name = "HttpError";
    this.status = status;
    this.data = data;
    this.headers = headers;

    Object.setPrototypeOf(this, HttpError.prototype);
  }
}

function buildUrl(
  baseUrl: string,
  path: string,
  params?: Record<string, string>,
): string {
  const url = new URL(path, baseUrl);

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }

  return url.toString();
}

export class HttpClient implements HttpTransport {
  private readonly baseUrl: string;
  private readonly defaultHeaders: Record<string, string>;
  private readonly defaultTimeout: number;

  constructor(options: {
    baseUrl: string;
    headers?: Record<string, string>;
    timeout?: number;
  }) {
    this.baseUrl = options.baseUrl;
    this.defaultHeaders = options.headers ?? {};
    this.defaultTimeout = options.timeout ?? 30000;
  }

  async request<T = unknown>(
    options: TransportRequestOptions,
  ): Promise<TransportResponse<T>> {
    const url = buildUrl(this.baseUrl, options.url, options.params);
    const controller = new AbortController();
    const timeout = options.timeout ?? this.defaultTimeout;
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const headers: Record<string, string> = {
      ...this.defaultHeaders,
      ...options.headers,
    };

    let body: string | undefined;

    if (options.body !== undefined) {
      body = JSON.stringify(options.body);
      headers["Content-Type"] ??= "application/json";
    }

    try {
      const fetchOptions: RequestInit = {
        method: options.method,
        headers,
        signal: controller.signal,
      };

      if (body !== undefined) {
        fetchOptions.body = body;
      }

      const response = await fetch(url, fetchOptions);

      const contentType = response.headers.get("content-type") ?? "";
      const text = await response.text();
      let data: unknown;

      if (contentType.includes("application/json") && text.trim().length > 0) {
        data = JSON.parse(text);
      } else if (text.trim().length > 0) {
        try {
          data = JSON.parse(text);
        } catch {
          data = text;
        }
      } else {
        data = {};
      }

      if (!response.ok) {
        throw new HttpError(response.status, data, response.headers);
      }

      return {
        data: data as T,
        status: response.status,
        headers: response.headers,
      };
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }

      if (error instanceof DOMException && error.name === "AbortError") {
        const timeoutError = new Error("Request timed out");
        timeoutError.name = "TimeoutError";
        throw timeoutError;
      }

      if (error instanceof TypeError) {
        const networkError = new Error(
          "Network error. Please check your internet connection.",
        );
        networkError.name = "NetworkError";
        networkError.cause = error;
        throw networkError;
      }

      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async get<T = unknown>(
    url: string,
    options?: Omit<TransportRequestOptions, "method" | "url" | "body">,
  ): Promise<TransportResponse<T>> {
    return this.request<T>({ method: "GET", url, ...options });
  }

  async post<T = unknown>(
    url: string,
    body?: unknown,
    options?: Omit<TransportRequestOptions, "method" | "url" | "body">,
  ): Promise<TransportResponse<T>> {
    return this.request<T>({ method: "POST", url, body, ...options });
  }

  async delete<T = unknown>(
    url: string,
    options?: Omit<TransportRequestOptions, "method" | "url" | "body">,
  ): Promise<TransportResponse<T>> {
    return this.request<T>({ method: "DELETE", url, ...options });
  }
}
