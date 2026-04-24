import {
  createCipheriv,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "crypto";
import { OMPayError } from "./errors.js";
import { HttpClient } from "./http.js";
import type {
  OMPayConfig,
  Environment,
  MerchantConfig,
  MerchantRequestContext,
  CustomerFields,
  CreateCheckoutRequest,
  CreateCheckoutResponse,
  CheckoutOptions,
  MerchantEncryptedCardPayload,
  MerchantInitiateTransactionRequest,
  MerchantInitiateTransactionResponse,
  MerchantDigitalCard,
  MerchantDigitalCardListResponse,
  MerchantDeleteDigitalCardResponse,
  MerchantOrderRequest,
  MerchantOrderResponse,
  MerchantRefundRequest,
  MerchantRefundResponse,
  MerchantSecuredCardDetails,
  MerchantRedirectionData,
  MerchantTransactionStatusResponse,
  OrderStatusResponse,
  PaymentDetails,
  PaymentStatus,
  SignaturePayload,
} from "./types.js";

const API_URLS: Record<Environment, string> = {
  sandbox: "https://api.uat.gateway.ompay.com",
  production: "https://api.gateway.ompay.com",
};

const CHECKOUT_URLS: Record<Environment, string> = {
  sandbox: "https://merchant.uat.gateway.ompay.com/cpbs/pg",
  production: "https://merchant.gateway.ompay.com/cpbs/pg",
};

const DEFAULT_TIMEOUT = 30000;

type ApiRecord = Record<string, unknown>;

function isRecord(value: unknown): value is ApiRecord {
  return typeof value === "object" && value !== null;
}

function getString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? value
    : undefined;
}

function getNumber(value: unknown): number | undefined {
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

function extractPayload(data: unknown): ApiRecord {
  if (!isRecord(data)) {
    return {};
  }

  return isRecord(data["data"]) ? (data["data"] as ApiRecord) : data;
}

function resolveCustomerFields(
  request: CreateCheckoutRequest,
): CustomerFields | undefined {
  return request.customerFields ?? request.customer;
}

function mapPaymentDetails(value: unknown): PaymentDetails | undefined {
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

function normalizePaymentStatus(value: unknown): PaymentStatus | string {
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

function safeCompare(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left.toLowerCase(), "utf8");
  const rightBuffer = Buffer.from(right.toLowerCase(), "utf8");

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

function isDefined<T>(value: T | undefined): value is T {
  return value !== undefined;
}

function serializePayload(payload?: string | ApiRecord): string {
  if (typeof payload === "string") {
    return payload;
  }

  return payload ? JSON.stringify(payload) : "";
}

function mapRedirectionData(value: unknown): MerchantRedirectionData | undefined {
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

function mapSecuredCardDetails(
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

function mapDigitalCard(value: unknown): MerchantDigitalCard | undefined {
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

interface ResolvedMerchantRequestContext {
  browserFingerprint: string;
  userAgent: string;
  domain: string;
  acceptLanguage: string;
  ipAddress?: string;
}

export class OMPayClient {
  private readonly httpClient: HttpClient;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly environment: Environment;
  private readonly merchantConfig: MerchantConfig | undefined;

  constructor(config: OMPayConfig) {
    this.validateConfig(config);

    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.environment = config.environment ?? "sandbox";
    this.merchantConfig = config.merchant;

    const baseURL = API_URLS[this.environment];

    this.httpClient = new HttpClient({
      baseUrl: baseURL,
      timeout: config.timeout ?? DEFAULT_TIMEOUT,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(
          `${this.clientId}:${this.clientSecret}`,
        ).toString("base64")}`,
      },
    });
  }

  private getMerchantBasePath(): string {
    return "/nac/api/v1/merchant-host";
  }

  private getMerchantPath(path: string): string {
    return `${this.getMerchantBasePath()}${path}`;
  }

  private resolveMerchantContext(
    context?: MerchantRequestContext,
  ): ResolvedMerchantRequestContext {
    const ipAddress = context?.ipAddress ?? this.merchantConfig?.ipAddress;
    const resolvedContext: ResolvedMerchantRequestContext = {
      browserFingerprint:
        context?.browserFingerprint ?? this.merchantConfig?.browserFingerprint ?? "",
      userAgent: context?.userAgent ?? this.merchantConfig?.userAgent ?? "",
      domain: context?.domain ?? this.merchantConfig?.domain ?? "",
      acceptLanguage:
        context?.acceptLanguage ??
        this.merchantConfig?.acceptLanguage ??
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

  generateMerchantSignature(
    apiPath: string,
    payload?: string | ApiRecord,
  ): string {
    if (!apiPath || typeof apiPath !== "string" || !apiPath.startsWith("/")) {
      throw new OMPayError({
        code: "VALIDATION_ERROR",
        message: "apiPath is required and must start with '/'",
      });
    }

    return createHmac("sha256", this.clientSecret)
      .update(`${apiPath}${serializePayload(payload)}`)
      .digest("hex");
  }

  buildMerchantHeaders(
    apiPath: string,
    context?: MerchantRequestContext,
    payload?: string | ApiRecord,
  ): Record<string, string> {
    const merchantContext = this.resolveMerchantContext(context);

    return {
      Authorization: `Basic ${Buffer.from(
        `${this.clientId}:${this.clientSecret}`,
      ).toString("base64")}`,
      "Content-Type": "application/json",
      "Accept-Language": merchantContext.acceptLanguage,
      "X-Signature": this.generateMerchantSignature(apiPath, payload),
      "X-MERCHANT-BROWSER-FINGERPRINT": merchantContext.browserFingerprint,
      "X-MERCHANT-USER-AGENT": merchantContext.userAgent,
      "X-MERCHANT-DOMAIN": merchantContext.domain,
      ...(merchantContext.ipAddress
        ? { "X-MERCHANT-IP": merchantContext.ipAddress }
        : {}),
    };
  }

  encryptCardDetails(
    cardDetails: MerchantEncryptedCardPayload,
    cardEncryptionKey = this.merchantConfig?.cardEncryptionKey,
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

  private validateConfig(config: OMPayConfig): void {
    if (!config.clientId || typeof config.clientId !== "string") {
      throw new OMPayError({
        code: "VALIDATION_ERROR",
        message: "clientId is required and must be a string",
      });
    }

    if (!config.clientSecret || typeof config.clientSecret !== "string") {
      throw new OMPayError({
        code: "VALIDATION_ERROR",
        message: "clientSecret is required and must be a string",
      });
    }

    if (
      config.environment &&
      !["sandbox", "production"].includes(config.environment)
    ) {
      throw new OMPayError({
        code: "VALIDATION_ERROR",
        message: "environment must be either 'sandbox' or 'production'",
      });
    }
  }

  async createCheckout(
    request: CreateCheckoutRequest,
  ): Promise<CreateCheckoutResponse> {
    this.validateCheckoutRequest(request);

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
      const response = await this.httpClient.post<ApiRecord>(
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
      throw OMPayError.fromHttpError(
        error,
      );
    }
  }

  private validateCheckoutRequest(request: CreateCheckoutRequest): void {
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

  async checkStatus(orderId: string): Promise<OrderStatusResponse> {
    if (!orderId || typeof orderId !== "string") {
      throw new OMPayError({
        code: "VALIDATION_ERROR",
        message: "orderId is required and must be a string",
      });
    }

    try {
      const response = await this.httpClient.get<ApiRecord>(
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
      throw OMPayError.fromHttpError(
        error,
      );
    }
  }

  async createOrder(
    request: MerchantOrderRequest,
    context?: MerchantRequestContext,
  ): Promise<MerchantOrderResponse> {
    this.validateMerchantOrderRequest(request);

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
      const response = await this.httpClient.post<ApiRecord>(
        this.getMerchantPath(apiPath),
        payload,
        {
          headers: this.buildMerchantHeaders(apiPath, context, payload),
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
      throw OMPayError.fromHttpError(
        error,
      );
    }
  }

  private validateMerchantOrderRequest(request: MerchantOrderRequest): void {
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

  async initiateTransaction(
    request: MerchantInitiateTransactionRequest,
    context?: MerchantRequestContext,
  ): Promise<MerchantInitiateTransactionResponse> {
    this.validateMerchantInitiateRequest(request);

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
      const response = await this.httpClient.post<ApiRecord>(
        this.getMerchantPath(apiPath),
        payload,
        {
          headers: this.buildMerchantHeaders(apiPath, context, payload),
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
      throw OMPayError.fromHttpError(
        error,
      );
    }
  }

  private validateMerchantInitiateRequest(
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

  async getTransactionStatus(
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
      const response = await this.httpClient.get<ApiRecord>(
        this.getMerchantPath(apiPath),
        {
          headers: this.buildMerchantHeaders(apiPath, context),
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
      throw OMPayError.fromHttpError(
        error,
      );
    }
  }

  async refundTransaction(
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
      const response = await this.httpClient.post<ApiRecord>(
        this.getMerchantPath(apiPath),
        payload,
        {
          headers: this.buildMerchantHeaders(apiPath, context, payload),
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
      throw OMPayError.fromHttpError(
        error,
      );
    }
  }

  async listDigitalCards(
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
      const response = await this.httpClient.get<ApiRecord>(
        this.getMerchantPath(apiPath),
        {
          headers: this.buildMerchantHeaders(apiPath, context),
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
      throw OMPayError.fromHttpError(
        error,
      );
    }
  }

  async deleteDigitalCard(
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
      const response = await this.httpClient.delete<ApiRecord>(
        this.getMerchantPath(apiPath),
        {
          headers: this.buildMerchantHeaders(apiPath, context),
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
      throw OMPayError.fromHttpError(
        error,
      );
    }
  }

  verifyWebhookSignature(message: string, providedSignature: string): boolean {
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

    const expectedSignature = createHmac("sha256", this.clientSecret)
      .update(message)
      .digest("hex");

    return safeCompare(expectedSignature, providedSignature.trim());
  }

  verifySignature(payload: SignaturePayload, signature: string): boolean {
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
    const expectedSignature = createHmac("sha256", this.clientSecret)
      .update(dataToSign)
      .digest("hex");

    return safeCompare(expectedSignature, signature.trim());
  }

  verifySignatureOrThrow(payload: SignaturePayload, signature: string): void {
    if (!this.verifySignature(payload, signature)) {
      throw OMPayError.signatureMismatch();
    }
  }

  getClientId(): string {
    return this.clientId;
  }

  getEnvironment(): Environment {
    return this.environment;
  }

  getBaseUrl(): string {
    return API_URLS[this.environment];
  }

  buildCheckoutUrl(
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

    const checkoutUrl = new URL(CHECKOUT_URLS[this.environment]);

    checkoutUrl.searchParams.set("actionType", "checkout");
    checkoutUrl.searchParams.set("orderId", options.orderId);
    checkoutUrl.searchParams.set("redirectUrl", options.redirectUrl);
    checkoutUrl.searchParams.set("clientId", options.clientId ?? this.clientId);

    return checkoutUrl.toString();
  }
}
