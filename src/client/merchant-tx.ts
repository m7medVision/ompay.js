import { OMPayError } from "../errors.js";
import type { HttpTransport } from "../transport.js";
import type {
  MerchantRequestContext,
  MerchantTransactionStatusResponse,
  MerchantRefundRequest,
  MerchantRefundResponse,
} from "../types/index.js";
import { buildMerchantHeaders, type CryptoDeps } from "./crypto.js";
import {
  isRecord,
  getString,
  getNumber,
  extractPayload,
  normalizePaymentStatus,
  mapPaymentDetails,
} from "./utils.js";
import type { ApiRecord } from "./utils.js";

const MERCHANT_BASE_PATH = "/nac/api/v1/merchant-host";

function getMerchantPath(path: string): string {
  return `${MERCHANT_BASE_PATH}${path}`;
}

export async function getTransactionStatus(
  transport: HttpTransport,
  cryptoDeps: CryptoDeps,
  paymentId: string,
  context?: MerchantRequestContext,
): Promise<MerchantTransactionStatusResponse> {
  if (!paymentId || typeof paymentId !== "string") {
    throw new OMPayError({
      code: "VALIDATION_ERROR",
      message: "paymentId is required and must be a string",
    });
  }

  const apiPath = `/transaction/status/${paymentId}`;

  try {
    const response = await transport.get<ApiRecord>(
      getMerchantPath(apiPath),
      {
        headers: buildMerchantHeaders(cryptoDeps, apiPath, context),
      },
    );

    const body = isRecord(response.data) ? response.data : {};
    const data = extractPayload(response.data);

    return {
      paymentId: String(data["paymentId"] ?? paymentId),
      orderId: String(data["orderId"] ?? ""),
      receiptId: getString(data["receiptId"]),
      paymentStatus: normalizePaymentStatus(data["paymentStatus"]),
      paymentMethod: getString(data["paymentMethod"]),
      transactionType: getString(data["transactionType"]),
      amount: getNumber(data["amount"]),
      currency: getString(data["currency"]),
      initiatedAt: getString(data["initiatedAt"]),
      completedAt: getString(data["completedAt"]),
      signature: getString(data["signature"]),
      description: getString(data["description"]),
      paymentDetails: mapPaymentDetails(data["paymentDetails"]),
      status: normalizePaymentStatus(body["status"]),
      resCode: getNumber(body["resCode"]),
      errMessage: getString(body["errMessage"]),
      data: body,
    };
  } catch (error) {
    throw OMPayError.fromHttpError(error);
  }
}

export async function refundTransaction(
  transport: HttpTransport,
  cryptoDeps: CryptoDeps,
  request: MerchantRefundRequest,
  context?: MerchantRequestContext,
): Promise<MerchantRefundResponse> {
  if (!request.paymentId || typeof request.paymentId !== "string") {
    throw new OMPayError({
      code: "VALIDATION_ERROR",
      message: "paymentId is required and must be a string",
    });
  }

  if (typeof request.amount !== "number" || request.amount <= 0) {
    throw new OMPayError({
      code: "VALIDATION_ERROR",
      message: "amount must be a positive number",
    });
  }

  const apiPath = "/transaction/refund";
  const payload: ApiRecord = {
    paymentId: request.paymentId,
    amount: request.amount,
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
      refundId: getString(data["refundId"]),
      paymentId: String(data["paymentId"] ?? request.paymentId),
      orderId: String(data["orderId"] ?? ""),
      receiptId: getString(data["receiptId"]),
      paymentStatus: normalizePaymentStatus(data["paymentStatus"]),
      paymentMethod: getString(data["paymentMethod"]),
      amount: getNumber(data["amount"]),
      currency: getString(data["currency"]),
      initiatedAt: getString(data["initiatedAt"]),
      completedAt: getString(data["completedAt"] ?? data["compltedAt"]),
      signature: getString(data["signature"] ?? data["signarture"]),
      status: normalizePaymentStatus(body["status"]),
      resCode: getNumber(body["resCode"]),
      errMessage: getString(body["errMessage"]),
      data: body,
    };
  } catch (error) {
    throw OMPayError.fromHttpError(error);
  }
}
