import { timingSafeEqual } from "crypto";
import type {
  PaymentStatus,
  CustomerFields,
  CreateCheckoutRequest,
  PaymentDetails,
  MerchantRedirectionData,
  MerchantSecuredCardDetails,
  MerchantDigitalCard,
} from "../types/index.js";

export type ApiRecord = Record<string, unknown>;

export function isRecord(value: unknown): value is ApiRecord {
  return typeof value === "object" && value !== null;
}

export function getString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? value
    : undefined;
}

export function getNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);

    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }

  return undefined;
}

export function extractPayload(data: unknown): ApiRecord {
  if (!isRecord(data)) {
    return {};
  }

  return isRecord(data["data"]) ? (data["data"] as ApiRecord) : data;
}

export function resolveCustomerFields(
  request: CreateCheckoutRequest,
): CustomerFields | undefined {
  return request.customerFields ?? request.customer;
}

export function mapPaymentDetails(value: unknown): PaymentDetails | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const paymentDetails: PaymentDetails = {};
  const paymentMethod = getString(value["paymentMethod"]);
  const cardNetwork = getString(value["cardNetwork"]);
  const cardType = getString(value["cardType"]);
  const cardUsageType = getString(value["cardUsageType"]);

  if (paymentMethod) {
    paymentDetails.paymentMethod = paymentMethod;
  }

  if (cardNetwork) {
    paymentDetails.cardNetwork = cardNetwork;
  }

  if (cardType) {
    paymentDetails.cardType = cardType;
  }

  if (cardUsageType) {
    paymentDetails.cardUsageType = cardUsageType;
  }

  return Object.keys(paymentDetails).length > 0 ? paymentDetails : undefined;
}

export function normalizePaymentStatus(value: unknown): PaymentStatus | string {
  const normalized = String(value ?? "").trim().toLowerCase();

  switch (normalized) {
    case "success":
    case "failure":
    case "failed":
    case "pending":
    case "cancelled":
      return normalized;
    default:
      return String(value ?? "");
  }
}

export function safeCompare(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left.toLowerCase(), "utf8");
  const rightBuffer = Buffer.from(right.toLowerCase(), "utf8");

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function isDefined<T>(value: T | undefined): value is T {
  return value !== undefined;
}

export function serializePayload(payload?: string | ApiRecord): string {
  if (typeof payload === "string") {
    return payload;
  }

  return payload ? JSON.stringify(payload) : "";
}

export function mapRedirectionData(value: unknown): MerchantRedirectionData | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const redirectionData: MerchantRedirectionData = {};
  const method = getString(value["method"]);
  const formData = getString(value["formData"]);

  if (method) {
    redirectionData.method = method;
  }

  if (formData) {
    redirectionData.formData = formData;
  }

  return Object.keys(redirectionData).length > 0 ? redirectionData : undefined;
}

export function mapSecuredCardDetails(
  value: unknown,
): MerchantSecuredCardDetails | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const securedCardDetails: MerchantSecuredCardDetails = {};
  const customerId = getString(value["customerId"]);
  const digitalCardId = getString(value["digitalCardId"]);

  if (customerId) {
    securedCardDetails.customerId = customerId;
  }

  if (digitalCardId) {
    securedCardDetails.digitalCardId = digitalCardId;
  }

  return Object.keys(securedCardDetails).length > 0
    ? securedCardDetails
    : undefined;
}

export function mapDigitalCard(value: unknown): MerchantDigitalCard | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const digitalCardId = getString(value["digitalCardId"]);

  if (!digitalCardId) {
    return undefined;
  }

  return {
    digitalCardId,
    network: getString(value["network"]),
    cardType: getString(value["cardType"]),
    status: getString(value["status"]),
    panLastFour: getString(value["panLastFour"]),
    createdAt: getString(value["createdAt"]),
    updatedAt: getString(value["updatedAt"]),
  };
}
