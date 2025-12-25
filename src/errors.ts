import type { AxiosError } from "axios";

export type OMPayErrorCode =
  | "AUTHENTICATION_ERROR"
  | "VALIDATION_ERROR"
  | "API_ERROR"
  | "NETWORK_ERROR"
  | "SIGNATURE_MISMATCH"
  | "TIMEOUT_ERROR"
  | "UNKNOWN_ERROR";

export interface OMPayErrorDetails {
  code: OMPayErrorCode;
  message: string;
  statusCode?: number;
  originalError?: Error;
  response?: Record<string, unknown>;
}

export class OMPayError extends Error {
  readonly code: OMPayErrorCode;
  readonly statusCode?: number | undefined;
  readonly response?: Record<string, unknown> | undefined;
  readonly originalError?: Error | undefined;

  constructor(details: OMPayErrorDetails) {
    super(details.message);
    this.name = "OMPayError";
    this.code = details.code;
    this.statusCode = details.statusCode ?? undefined;
    this.response = details.response ?? undefined;
    this.originalError = details.originalError ?? undefined;

    Object.setPrototypeOf(this, OMPayError.prototype);
  }

  static fromAxiosError(
    error: AxiosError<Record<string, unknown>>,
  ): OMPayError {
    if (error.response) {
      const statusCode = error.response.status;
      const responseData = error.response.data;

      if (statusCode === 401 || statusCode === 403) {
        return new OMPayError({
          code: "AUTHENTICATION_ERROR",
          message:
            "Authentication failed. Please check your client ID and secret.",
          statusCode,
          response: responseData,
          originalError: error,
        });
      }

      if (statusCode === 400 || statusCode === 422) {
        return new OMPayError({
          code: "VALIDATION_ERROR",
          message: String(
            responseData?.["message"] ?? "Validation error occurred",
          ),
          statusCode,
          response: responseData,
          originalError: error,
        });
      }

      return new OMPayError({
        code: "API_ERROR",
        message: String(
          responseData?.["message"] ?? `API error: ${statusCode}`,
        ),
        statusCode,
        response: responseData,
        originalError: error,
      });
    }

    if (error.code === "ECONNABORTED") {
      return new OMPayError({
        code: "TIMEOUT_ERROR",
        message: "Request timed out",
        originalError: error,
      });
    }

    if (error.request) {
      return new OMPayError({
        code: "NETWORK_ERROR",
        message: "Network error. Please check your internet connection.",
        originalError: error,
      });
    }

    return new OMPayError({
      code: "UNKNOWN_ERROR",
      message: error.message || "An unknown error occurred",
      originalError: error,
    });
  }

  static signatureMismatch(): OMPayError {
    return new OMPayError({
      code: "SIGNATURE_MISMATCH",
      message:
        "Payment signature verification failed. The signature does not match.",
    });
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      response: this.response,
    };
  }
}
