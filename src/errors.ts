import { HttpError } from "./http.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getResponseData(
  responseData: unknown,
): Record<string, unknown> | undefined {
  if (isRecord(responseData)) {
    return responseData;
  }

  if (typeof responseData === "string" && responseData.trim().length > 0) {
    return { message: responseData };
  }

  return undefined;
}

function getErrorMessage(responseData: Record<string, unknown> | undefined): string {
  const message =
    responseData?.["errMessage"] ??
    responseData?.["message"] ??
    responseData?.["error"];

  if (typeof message === "string" && message.trim().length > 0) {
    return message;
  }

  const resCode = responseData?.["resCode"];

  if (typeof resCode === "number") {
    return `Gateway error (${resCode})`;
  }

  return "An unknown API error occurred";
}

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

  static fromHttpError(error: unknown): OMPayError {
    if (error instanceof HttpError) {
      const statusCode = error.status;
      const responseData = getResponseData(error.data);
      const message = getErrorMessage(responseData);

      if (statusCode === 401 || statusCode === 403) {
        return new OMPayError({
          code: "AUTHENTICATION_ERROR",
          message,
          statusCode,
          ...(responseData ? { response: responseData } : {}),
          originalError: error,
        });
      }

      if (statusCode === 400 || statusCode === 422) {
        return new OMPayError({
          code: "VALIDATION_ERROR",
          message,
          statusCode,
          ...(responseData ? { response: responseData } : {}),
          originalError: error,
        });
      }

      return new OMPayError({
        code: "API_ERROR",
        message,
        statusCode,
        ...(responseData ? { response: responseData } : {}),
        originalError: error,
      });
    }

    if (error instanceof Error && error.name === "TimeoutError") {
      return new OMPayError({
        code: "TIMEOUT_ERROR",
        message: "Request timed out",
        originalError: error,
      });
    }

    if (error instanceof Error && error.name === "NetworkError") {
      return new OMPayError({
        code: "NETWORK_ERROR",
        message: "Network error. Please check your internet connection.",
        originalError: error,
      });
    }

    if (error instanceof Error) {
      return new OMPayError({
        code: "UNKNOWN_ERROR",
        message: error.message || "An unknown error occurred",
        originalError: error,
      });
    }

    return new OMPayError({
      code: "UNKNOWN_ERROR",
      message: "An unknown error occurred",
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
