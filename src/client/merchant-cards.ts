import { OMPayError } from "../errors.js";
import { HttpClient } from "../http.js";
import type {
  MerchantRequestContext,
  MerchantDigitalCardListResponse,
  MerchantDeleteDigitalCardResponse,
} from "../types/index.js";
import { buildMerchantHeaders, type CryptoDeps } from "./crypto.js";
import {
  isRecord,
  getString,
  getNumber,
  extractPayload,
  normalizePaymentStatus,
  mapDigitalCard,
  isDefined,
} from "./utils.js";
import type { ApiRecord } from "./utils.js";

const MERCHANT_BASE_PATH = "/nac/api/v1/merchant-host";

function getMerchantPath(path: string): string {
  return `${MERCHANT_BASE_PATH}${path}`;
}

export async function listDigitalCards(
  httpClient: HttpClient,
  cryptoDeps: CryptoDeps,
  customerId: string,
  context?: MerchantRequestContext,
): Promise<MerchantDigitalCardListResponse> {
  if (!customerId || typeof customerId !== "string") {
    throw new OMPayError({
      code: "VALIDATION_ERROR",
      message: "customerId is required and must be a string",
    });
  }

  const apiPath = `/customer/${customerId}/digitalCards`;

  try {
    const response = await httpClient.get<ApiRecord>(
      getMerchantPath(apiPath),
      {
        headers: buildMerchantHeaders(cryptoDeps, apiPath, context),
      },
    );

    const body = isRecord(response.data) ? response.data : {};
    const data = extractPayload(response.data);
    const digitalCards = Array.isArray(data["digitalCards"])
      ? data["digitalCards"].map(mapDigitalCard).filter(isDefined)
      : [];

    return {
      digitalCards,
      remainingLimit: getNumber(data["remainingLimit"]),
      status: normalizePaymentStatus(body["status"]),
      resCode: getNumber(body["resCode"]),
      errMessage: getString(body["errMessage"]),
      data: body,
    };
  } catch (error) {
    throw OMPayError.fromHttpError(error);
  }
}

export async function deleteDigitalCard(
  httpClient: HttpClient,
  cryptoDeps: CryptoDeps,
  customerId: string,
  digitalCardId: string,
  context?: MerchantRequestContext,
): Promise<MerchantDeleteDigitalCardResponse> {
  if (!customerId || typeof customerId !== "string") {
    throw new OMPayError({
      code: "VALIDATION_ERROR",
      message: "customerId is required and must be a string",
    });
  }

  if (!digitalCardId || typeof digitalCardId !== "string") {
    throw new OMPayError({
      code: "VALIDATION_ERROR",
      message: "digitalCardId is required and must be a string",
    });
  }

  const apiPath = `/customer/${customerId}/digitalCards/${digitalCardId}`;

  try {
    const response = await httpClient.delete<ApiRecord>(
      getMerchantPath(apiPath),
      {
        headers: buildMerchantHeaders(cryptoDeps, apiPath, context),
      },
    );

    const body = isRecord(response.data) ? response.data : {};
    const data = extractPayload(response.data);

    return {
      customerId: getString(data["customerId"]),
      digitalCardId: getString(data["digitalCardId"]),
      status: normalizePaymentStatus(body["status"]),
      resCode: getNumber(body["resCode"]),
      errMessage: getString(body["errMessage"]),
      data: body,
    };
  } catch (error) {
    throw OMPayError.fromHttpError(error);
  }
}
