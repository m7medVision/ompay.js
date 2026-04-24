import { OMPayError } from "../errors.js";
import { HttpClient } from "../http.js";
import type {
  OMPayConfig,
  Environment,
  MerchantRequestContext,
  MerchantEncryptedCardPayload,
  CreateCheckoutRequest,
  CreateCheckoutResponse,
  OrderStatusResponse,
  CheckoutOptions,
  MerchantOrderRequest,
  MerchantOrderResponse,
  MerchantInitiateTransactionRequest,
  MerchantInitiateTransactionResponse,
  MerchantTransactionStatusResponse,
  MerchantRefundRequest,
  MerchantRefundResponse,
  MerchantDigitalCardListResponse,
  MerchantDeleteDigitalCardResponse,
  SignaturePayload,
} from "../types/index.js";
import { API_URLS, DEFAULT_TIMEOUT } from "./constants.js";
import {
  encryptCardDetails as encryptCardDetailsFn,
  generateMerchantSignature as generateSignatureFn,
  buildMerchantHeaders as buildMerchantHeadersFn,
  verifyWebhookSignature as verifyWebhookFn,
  verifySignature as verifySignatureFn,
  verifySignatureOrThrow as verifySignatureOrThrowFn,
  type CryptoDeps,
} from "./crypto.js";
import {
  createCheckout,
  checkStatus,
  buildCheckoutUrl,
} from "./checkout.js";
import {
  createOrder,
  initiateTransaction,
} from "./merchant-orders.js";
import {
  getTransactionStatus,
  refundTransaction,
} from "./merchant-tx.js";
import {
  listDigitalCards,
  deleteDigitalCard,
} from "./merchant-cards.js";

export class OMPayClient {
  private readonly httpClient: HttpClient;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly environment: Environment;
  private readonly merchantConfig: OMPayConfig["merchant"];

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

  private getCryptoDeps(): CryptoDeps {
    return {
      clientId: this.clientId,
      clientSecret: this.clientSecret,
      merchantConfig: this.merchantConfig,
    };
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

  generateMerchantSignature(
    apiPath: string,
    payload?: string | Record<string, unknown>,
  ): string {
    return generateSignatureFn(this.clientSecret, apiPath, payload);
  }

  buildMerchantHeaders(
    apiPath: string,
    context?: MerchantRequestContext,
    payload?: string | Record<string, unknown>,
  ): Record<string, string> {
    return buildMerchantHeadersFn(this.getCryptoDeps(), apiPath, context, payload);
  }

  encryptCardDetails(
    cardDetails: MerchantEncryptedCardPayload,
    cardEncryptionKey = this.merchantConfig?.cardEncryptionKey,
  ): string {
    return encryptCardDetailsFn(cardDetails, cardEncryptionKey!);
  }

  async createCheckout(
    request: CreateCheckoutRequest,
  ): Promise<CreateCheckoutResponse> {
    return createCheckout(this.httpClient, request);
  }

  async checkStatus(orderId: string): Promise<OrderStatusResponse> {
    return checkStatus(this.httpClient, orderId);
  }

  async createOrder(
    request: MerchantOrderRequest,
    context?: MerchantRequestContext,
  ): Promise<MerchantOrderResponse> {
    return createOrder(this.httpClient, this.getCryptoDeps(), request, context);
  }

  async initiateTransaction(
    request: MerchantInitiateTransactionRequest,
    context?: MerchantRequestContext,
  ): Promise<MerchantInitiateTransactionResponse> {
    return initiateTransaction(this.httpClient, this.getCryptoDeps(), request, context);
  }

  async getTransactionStatus(
    paymentId: string,
    context?: MerchantRequestContext,
  ): Promise<MerchantTransactionStatusResponse> {
    return getTransactionStatus(this.httpClient, this.getCryptoDeps(), paymentId, context);
  }

  async refundTransaction(
    request: MerchantRefundRequest,
    context?: MerchantRequestContext,
  ): Promise<MerchantRefundResponse> {
    return refundTransaction(this.httpClient, this.getCryptoDeps(), request, context);
  }

  async listDigitalCards(
    customerId: string,
    context?: MerchantRequestContext,
  ): Promise<MerchantDigitalCardListResponse> {
    return listDigitalCards(this.httpClient, this.getCryptoDeps(), customerId, context);
  }

  async deleteDigitalCard(
    customerId: string,
    digitalCardId: string,
    context?: MerchantRequestContext,
  ): Promise<MerchantDeleteDigitalCardResponse> {
    return deleteDigitalCard(this.httpClient, this.getCryptoDeps(), customerId, digitalCardId, context);
  }

  verifyWebhookSignature(message: string, providedSignature: string): boolean {
    return verifyWebhookFn(this.clientSecret, message, providedSignature);
  }

  verifySignature(payload: SignaturePayload, signature: string): boolean {
    return verifySignatureFn(this.clientSecret, payload, signature);
  }

  verifySignatureOrThrow(payload: SignaturePayload, signature: string): void {
    verifySignatureOrThrowFn(this.clientSecret, payload, signature);
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
    return buildCheckoutUrl(this.environment, this.clientId, orderIdOrOptions, redirectUrl);
  }
}
