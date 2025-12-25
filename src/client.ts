import axios, { type AxiosInstance, type AxiosError } from "axios";
import { createHmac } from "crypto";
import { OMPayError } from "./errors.js";
import type {
  OMPayConfig,
  Environment,
  CreateCheckoutRequest,
  CreateCheckoutResponse,
  OrderStatusResponse,
  SignaturePayload,
} from "./types.js";

const API_URLS: Record<Environment, string> = {
  sandbox: "https://api.uat.gateway.ompay.com",
  production: "https://api.gateway.ompay.com",
};

const DEFAULT_TIMEOUT = 30000;

export class OMPayClient {
  private readonly httpClient: AxiosInstance;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly environment: Environment;

  constructor(config: OMPayConfig) {
    this.validateConfig(config);

    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.environment = config.environment ?? "sandbox";

    const baseURL = API_URLS[this.environment];

    this.httpClient = axios.create({
      baseURL,
      timeout: config.timeout ?? DEFAULT_TIMEOUT,
      headers: {
        "Content-Type": "application/json",
      },
      auth: {
        username: this.clientId,
        password: this.clientSecret,
      },
    });
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

    const payload = {
      amount: request.amount,
      currency: request.currency,
      uiMode: request.uiMode ?? "checkout",
      redirectType: request.redirectType ?? "redirect",
      phone: request.customer.phone,
      email: request.customer.email,
      name: request.customer.name,
      ...(request.orderReference && { orderReference: request.orderReference }),
      ...(request.metadata && { metadata: request.metadata }),
    };

    try {
      const response = await this.httpClient.post<Record<string, unknown>>(
        "/nac/api/v1/pg/orders/create-checkout",
        payload,
      );

      return {
        orderId: String(response.data["orderId"] ?? ""),
        checkoutUrl: response.data["checkoutUrl"] as string | undefined,
        status: String(response.data["status"] ?? ""),
        data: response.data,
      };
    } catch (error) {
      throw OMPayError.fromAxiosError(
        error as AxiosError<Record<string, unknown>>,
      );
    }
  }

  private validateCheckoutRequest(request: CreateCheckoutRequest): void {
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

    if (!request.customer) {
      throw new OMPayError({
        code: "VALIDATION_ERROR",
        message: "customer information is required",
      });
    }

    if (
      !request.customer.phone ||
      !request.customer.email ||
      !request.customer.name
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
      const response = await this.httpClient.get<Record<string, unknown>>(
        "/nac/api/v1/pg/orders/check-status",
        {
          params: { orderId },
        },
      );

      const data = response.data;

      return {
        orderId: String(data["orderId"] ?? orderId),
        status: data["status"] as OrderStatusResponse["status"],
        paymentId: data["paymentId"] as string | undefined,
        amount: data["amount"] as number | undefined,
        currency: data["currency"] as string | undefined,
        paymentDetails: data[
          "paymentDetails"
        ] as OrderStatusResponse["paymentDetails"],
        createdAt: data["createdAt"] as string | undefined,
        updatedAt: data["updatedAt"] as string | undefined,
        data,
      };
    } catch (error) {
      throw OMPayError.fromAxiosError(
        error as AxiosError<Record<string, unknown>>,
      );
    }
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

    const dataToSign = `${payload.orderId}/${payload.paymentId}`;
    const expectedSignature = createHmac("sha256", this.clientSecret)
      .update(dataToSign)
      .digest("hex");

    return expectedSignature === signature;
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
}
