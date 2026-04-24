import { OMPayError } from "../errors.js";
import type { HttpTransport } from "../transport.js";
import type {
  CreateCheckoutRequest,
  CreateCheckoutResponse,
  OrderStatusResponse,
  CheckoutOptions,
  Environment,
} from "../types/index.js";
import { CHECKOUT_URLS } from "./constants.js";
import {
  isRecord,
  getString,
  getNumber,
  extractPayload,
  resolveCustomerFields,
  mapPaymentDetails,
  normalizePaymentStatus,
} from "./utils.js";
import type { ApiRecord } from "./utils.js";

export function validateCheckoutRequest(request: CreateCheckoutRequest): void {
  const customerFields = resolveCustomerFields(request);

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

  if (request.uiMode && request.uiMode !== "checkout") {
    throw new OMPayError({
      code: "VALIDATION_ERROR",
      message: "uiMode must be 'checkout'",
    });
  }

  if (
    request.redirectType &&
    !["post", "redirect"].includes(request.redirectType)
  ) {
    throw new OMPayError({
      code: "VALIDATION_ERROR",
      message: "redirectType must be either 'post' or 'redirect'",
    });
  }

  if (!customerFields) {
    throw new OMPayError({
      code: "VALIDATION_ERROR",
      message: "customer information is required",
    });
  }

  if (
    !customerFields.phone ||
    !customerFields.email ||
    !customerFields.name
  ) {
    throw new OMPayError({
      code: "VALIDATION_ERROR",
      message: "customer phone, email, and name are required",
    });
  }
}

export async function createCheckout(
  transport: HttpTransport,
  request: CreateCheckoutRequest,
): Promise<CreateCheckoutResponse> {
  validateCheckoutRequest(request);

  const customerFields = resolveCustomerFields(request);
  const receiptId = request.receiptId ?? request.orderReference;

  const payload: ApiRecord = {
    amount: request.amount,
    currency: request.currency,
    uiMode: request.uiMode ?? "checkout",
    redirectType: request.redirectType ?? "redirect",
    customerFields,
  };

  if (receiptId) {
    payload["receiptId"] = receiptId;
  }

  if (request.description) {
    payload["description"] = request.description;
  }

  if (request.curn) {
    payload["curn"] = request.curn;
  }

  if (request.metadata) {
    payload["metadata"] = request.metadata;
  }

  try {
    const response = await transport.post<ApiRecord>(
      "/nac/api/v1/pg/orders/create-checkout",
      payload,
    );

    const body = isRecord(response.data) ? response.data : {};
    const data = extractPayload(response.data);

    return {
      orderId: String(data["orderId"] ?? body["orderId"] ?? ""),
      amount: getNumber(data["amount"] ?? body["amount"]),
      currency: getString(data["currency"] ?? body["currency"]),
      receiptId: getString(data["receiptId"] ?? body["receiptId"]),
      checkoutUrl: getString(body["checkoutUrl"] ?? data["checkoutUrl"]),
      status: normalizePaymentStatus(data["status"] ?? body["status"]),
      resCode: getNumber(body["resCode"]),
      errMessage: getString(body["errMessage"]),
      data: body,
    };
  } catch (error) {
    throw OMPayError.fromHttpError(error);
  }
}

export async function checkStatus(
  transport: HttpTransport,
  orderId: string,
): Promise<OrderStatusResponse> {
  if (!orderId || typeof orderId !== "string") {
    throw new OMPayError({
      code: "VALIDATION_ERROR",
      message: "orderId is required and must be a string",
    });
  }

  try {
    const response = await transport.get<ApiRecord>(
      "/nac/api/v1/pg/orders/check-status",
      {
        params: { orderId },
      },
    );

    const body = isRecord(response.data) ? response.data : {};
    const data = extractPayload(response.data);

    return {
      orderId: String(data["orderId"] ?? orderId),
      status: normalizePaymentStatus(data["status"] ?? data["paymentStatus"]),
      paymentId: getString(data["paymentId"]),
      receiptId: getString(data["receiptId"]),
      amount: getNumber(data["amount"]),
      currency: getString(data["currency"]),
      signature: getString(data["signature"] ?? body["signature"]),
      timestamp: getString(data["timestamp"] ?? body["timestamp"]),
      paymentDetails: mapPaymentDetails(data["paymentDetails"]),
      createdAt: getString(data["initiatedAt"] ?? data["createdAt"]),
      updatedAt: getString(data["completedAt"] ?? data["updatedAt"]),
      data: body,
    };
  } catch (error) {
    throw OMPayError.fromHttpError(error);
  }
}

export function buildCheckoutUrl(
  environment: Environment,
  clientId: string,
  orderIdOrOptions: string | CheckoutOptions,
  redirectUrl?: string,
): string {
  const options: CheckoutOptions =
    typeof orderIdOrOptions === "string"
      ? { orderId: orderIdOrOptions, redirectUrl: redirectUrl ?? "" }
      : orderIdOrOptions;

  if (!options.orderId || typeof options.orderId !== "string") {
    throw new OMPayError({
      code: "VALIDATION_ERROR",
      message: "orderId is required and must be a string",
    });
  }

  if (!options.redirectUrl || typeof options.redirectUrl !== "string") {
    throw new OMPayError({
      code: "VALIDATION_ERROR",
      message: "redirectUrl is required and must be a string",
    });
  }

  const checkoutUrl = new URL(CHECKOUT_URLS[environment]);

  checkoutUrl.searchParams.set("actionType", "checkout");
  checkoutUrl.searchParams.set("orderId", options.orderId);
  checkoutUrl.searchParams.set("redirectUrl", options.redirectUrl);
  checkoutUrl.searchParams.set("clientId", options.clientId ?? clientId);

  return checkoutUrl.toString();
}
