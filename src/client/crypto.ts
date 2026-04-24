import { createHmac, randomBytes, createCipheriv } from "crypto";
import { OMPayError } from "../errors.js";
import type {
  MerchantConfig,
  MerchantRequestContext,
  MerchantEncryptedCardPayload,
  SignaturePayload,
} from "../types/index.js";
import { safeCompare, serializePayload } from "./utils.js";

export interface ResolvedMerchantRequestContext {
  browserFingerprint: string;
  userAgent: string;
  domain: string;
  acceptLanguage: string;
  ipAddress?: string;
}

export interface CryptoDeps {
  clientId: string;
  clientSecret: string;
  merchantConfig: MerchantConfig | undefined;
}

export function resolveMerchantContext(
  deps: CryptoDeps,
  context?: MerchantRequestContext,
): ResolvedMerchantRequestContext {
  const ipAddress = context?.ipAddress ?? deps.merchantConfig?.ipAddress;
  const resolvedContext: ResolvedMerchantRequestContext = {
    browserFingerprint:
      context?.browserFingerprint ?? deps.merchantConfig?.browserFingerprint ?? "",
    userAgent: context?.userAgent ?? deps.merchantConfig?.userAgent ?? "",
    domain: context?.domain ?? deps.merchantConfig?.domain ?? "",
    acceptLanguage:
      context?.acceptLanguage ??
      deps.merchantConfig?.acceptLanguage ??
      "en-US",
    ...(ipAddress ? { ipAddress } : {}),
  };

  const missingFields = [
    ["browserFingerprint", resolvedContext.browserFingerprint],
    ["userAgent", resolvedContext.userAgent],
    ["domain", resolvedContext.domain],
    ["acceptLanguage", resolvedContext.acceptLanguage],
  ].filter(([, value]) => !value);

  if (missingFields.length > 0) {
    throw new OMPayError({
      code: "VALIDATION_ERROR",
      message: `merchant request context is missing required fields: ${missingFields
        .map(([field]) => field)
        .join(", ")}`,
    });
  }

  return resolvedContext;
}

export function generateMerchantSignature(
  clientSecret: string,
  apiPath: string,
  payload?: string | Record<string, unknown>,
): string {
  if (!apiPath || typeof apiPath !== "string" || !apiPath.startsWith("/")) {
    throw new OMPayError({
      code: "VALIDATION_ERROR",
      message: "apiPath is required and must start with '/'",
    });
  }

  return createHmac("sha256", clientSecret)
    .update(`${apiPath}${serializePayload(payload)}`)
    .digest("hex");
}

export function buildMerchantHeaders(
  deps: CryptoDeps,
  apiPath: string,
  context?: MerchantRequestContext,
  payload?: string | Record<string, unknown>,
): Record<string, string> {
  const merchantContext = resolveMerchantContext(deps, context);

  return {
    Authorization: `Basic ${Buffer.from(
      `${deps.clientId}:${deps.clientSecret}`,
    ).toString("base64")}`,
    "Content-Type": "application/json",
    "Accept-Language": merchantContext.acceptLanguage,
    "X-Signature": generateMerchantSignature(deps.clientSecret, apiPath, payload),
    "X-MERCHANT-BROWSER-FINGERPRINT": merchantContext.browserFingerprint,
    "X-MERCHANT-USER-AGENT": merchantContext.userAgent,
    "X-MERCHANT-DOMAIN": merchantContext.domain,
    ...(merchantContext.ipAddress
      ? { "X-MERCHANT-IP": merchantContext.ipAddress }
      : {}),
  };
}

export function encryptCardDetails(
  cardDetails: MerchantEncryptedCardPayload,
  cardEncryptionKey: string,
): string {
  if (!cardEncryptionKey || typeof cardEncryptionKey !== "string") {
    throw new OMPayError({
      code: "VALIDATION_ERROR",
      message: "cardEncryptionKey is required for card encryption",
    });
  }

  if (!/^[0-9a-fA-F]{64}$/.test(cardEncryptionKey)) {
    throw new OMPayError({
      code: "VALIDATION_ERROR",
      message: "cardEncryptionKey must be a 64-character hex string",
    });
  }

  const iv = randomBytes(16);
  const cipher = createCipheriv(
    "aes-256-cbc",
    Buffer.from(cardEncryptionKey, "hex"),
    iv,
  );

  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(cardDetails), "utf8"),
    cipher.final(),
  ]).toString("hex");

  return `${iv.toString("hex")}.${encrypted}`;
}

export function verifyWebhookSignature(
  clientSecret: string,
  message: string,
  providedSignature: string,
): boolean {
  if (!message || typeof message !== "string") {
    throw new OMPayError({
      code: "VALIDATION_ERROR",
      message: "message is required and must be a string",
    });
  }

  if (!providedSignature || typeof providedSignature !== "string") {
    throw new OMPayError({
      code: "VALIDATION_ERROR",
      message: "providedSignature is required and must be a string",
    });
  }

  const expectedSignature = createHmac("sha256", clientSecret)
    .update(message)
    .digest("hex");

  return safeCompare(expectedSignature, providedSignature.trim());
}

export function verifySignature(
  clientSecret: string,
  payload: SignaturePayload,
  signature: string,
): boolean {
  if (!payload.orderId || !payload.paymentId) {
    throw new OMPayError({
      code: "VALIDATION_ERROR",
      message:
        "orderId and paymentId are required for signature verification",
    });
  }

  if (!signature || typeof signature !== "string") {
    throw new OMPayError({
      code: "VALIDATION_ERROR",
      message: "signature is required and must be a string",
    });
  }

  const dataToSign = `${payload.orderId}|${payload.paymentId}`;
  const expectedSignature = createHmac("sha256", clientSecret)
    .update(dataToSign)
    .digest("hex");

  return safeCompare(expectedSignature, signature.trim());
}

export function verifySignatureOrThrow(
  clientSecret: string,
  payload: SignaturePayload,
  signature: string,
): void {
  if (!verifySignature(clientSecret, payload, signature)) {
    throw OMPayError.signatureMismatch();
  }
}
