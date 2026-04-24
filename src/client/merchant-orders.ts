import { OMPayError } from "../errors.js";
import type { HttpTransport } from "../transport.js";
import type {
  MerchantRequestContext,
  MerchantOrderRequest,
  MerchantOrderResponse,
  MerchantInitiateTransactionRequest,
  MerchantInitiateTransactionResponse,
} from "../types/index.js";
import { buildMerchantHeaders, type CryptoDeps } from "./crypto.js";
import {
  isRecord,
  getString,
  getNumber,
  extractPayload,
  normalizePaymentStatus,
  mapRedirectionData,
  mapSecuredCardDetails,
} from "./utils.js";
import type { ApiRecord } from "./utils.js";

const MERCHANT_BASE_PATH = "/nac/api/v1/merchant-host";

function getMerchantPath(path: string): string {
  return `${MERCHANT_BASE_PATH}${path}`;
}

export function validateMerchantOrderRequest(request: MerchantOrderRequest): void {
  if (typeof request.amount !== "number" || request.amount <= 0) {
    throw new OMPayError({
      code: "VALIDATION_ERROR",
      message: "amount must be a positive number",
    });
  }

  if (!request.currency || typeof request.currency !== "string") {
    throw new OMPayError({
      code: "VALIDATION_ERROR",
      message: "currency is required and must be a string",
    });
  }

  if (!request.customerFields) {
    throw new OMPayError({
      code: "VALIDATION_ERROR",
      message: "customerFields is required",
    });
  }

  if (
    !request.customerFields.name ||
    !request.customerFields.email ||
    !request.customerFields.phone
  ) {
    throw new OMPayError({
      code: "VALIDATION_ERROR",
      message: "customerFields name, email, and phone are required",
    });
  }

  if (
    request.uiMode &&
    !["hosted", "checkout"].includes(request.uiMode)
  ) {
    throw new OMPayError({
      code: "VALIDATION_ERROR",
      message: "uiMode must be either 'hosted' or 'checkout'",
    });
  }
}

export async function createOrder(
  transport: HttpTransport,
  cryptoDeps: CryptoDeps,
  request: MerchantOrderRequest,
  context?: MerchantRequestContext,
): Promise<MerchantOrderResponse> {
  validateMerchantOrderRequest(request);

  const apiPath = "/order";
  const payload: ApiRecord = {
    amount: request.amount,
    currency: request.currency,
    description: request.description,
    customerFields: request.customerFields,
    uiMode: request.uiMode ?? "hosted",
    ...(request.receiptId ? { receiptId: request.receiptId } : {}),
  };

  try {
    const response = await transport.post<ApiRecord>(
      getMerchantPath(apiPath),
      payload,
      {
        headers: buildMerchantHeaders(cryptoDeps, apiPath, context, payload),
      },
    );

    const body = isRecord(response.data) ? response.data : {};
    const data = extractPayload(response.data);

    return {
      orderId: String(data["orderId"] ?? ""),
      receiptId: getString(data["receiptId"]),
      amount: getNumber(data["amount"]),
      currency: getString(data["currency"]),
      status: normalizePaymentStatus(body["status"]),
      resCode: getNumber(body["resCode"]),
      errMessage: getString(body["errMessage"]),
      data: body,
    };
  } catch (error) {
    throw OMPayError.fromHttpError(error);
  }
}

export function validateMerchantInitiateRequest(
  request: MerchantInitiateTransactionRequest,
): void {
  if (!request.orderId || typeof request.orderId !== "string") {
    throw new OMPayError({
      code: "VALIDATION_ERROR",
      message: "orderId is required and must be a string",
    });
  }

  if (
    !request.encryptedCardDetails ||
    typeof request.encryptedCardDetails !== "string"
  ) {
    throw new OMPayError({
      code: "VALIDATION_ERROR",
      message: "encryptedCardDetails is required and must be a string",
    });
  }

  if (!request.cardHolderName || typeof request.cardHolderName !== "string") {
    throw new OMPayError({
      code: "VALIDATION_ERROR",
      message: "cardHolderName is required and must be a string",
    });
  }

  if (!request.redirectionUrl || typeof request.redirectionUrl !== "string") {
    throw new OMPayError({
      code: "VALIDATION_ERROR",
      message: "redirectionUrl is required and must be a string",
    });
  }

  if (!["card", "token"].includes(request.paymentMode)) {
    throw new OMPayError({
      code: "VALIDATION_ERROR",
      message: "paymentMode must be either 'card' or 'token'",
    });
  }

  if (request.skipCVVOnlyFlag && request.skipCVVandOTP) {
    throw new OMPayError({
      code: "VALIDATION_ERROR",
      message: "skipCVVOnlyFlag and skipCVVandOTP cannot both be true",
    });
  }
}

export async function initiateTransaction(
  transport: HttpTransport,
  cryptoDeps: CryptoDeps,
  request: MerchantInitiateTransactionRequest,
  context?: MerchantRequestContext,
): Promise<MerchantInitiateTransactionResponse> {
  validateMerchantInitiateRequest(request);

  const apiPath = "/transaction/initiate";
  const payload: ApiRecord = {
    orderId: request.orderId,
    encryptedCardDetails: request.encryptedCardDetails,
    paymentMethod: request.paymentMethod ?? "card",
    cardHolderName: request.cardHolderName,
    redirectionUrl: request.redirectionUrl,
    paymentMode: request.paymentMode,
    secureCard: request.secureCard ?? false,
    skipCVVOnlyFlag: request.skipCVVOnlyFlag ?? false,
    skipCVVandOTP: request.skipCVVandOTP ?? false,
    apiType: request.apiType ?? "hosted",
  };

  try {
    const response = await transport.post<ApiRecord>(
      getMerchantPath(apiPath),
      payload,
      {
        headers: buildMerchantHeaders(cryptoDeps, apiPath, context, payload),
      },
    );

    const body = isRecord(response.data) ? response.data : {};
    const data = extractPayload(response.data);

    return {
      paymentId: String(data["paymentId"] ?? ""),
      orderId: String(data["orderId"] ?? request.orderId),
      receiptId: getString(data["receiptId"]),
      paymentStatus: normalizePaymentStatus(data["paymentStatus"]),
      amount: getNumber(data["amount"]),
      currency: getString(data["currency"]),
      redirectionData: mapRedirectionData(data["redirectionData"]),
      securedCardDetails: mapSecuredCardDetails(data["securedCardDetails"]),
      status: normalizePaymentStatus(body["status"]),
      resCode: getNumber(body["resCode"]),
      errMessage: getString(body["errMessage"]),
      data: body,
    };
  } catch (error) {
    throw OMPayError.fromHttpError(error);
  }
}
