/**
 * OMPAY SDK Types
 * @module ompay-sdk/types
 */

/**
 * Environment for OMPAY API
 */
export type Environment = "sandbox" | "production";

/**
 * UI Mode for checkout
 */
export type UIMode = "checkout";

/**
 * Redirect type after payment
 */
export type RedirectType = "post" | "redirect";

/**
 * Payment status
 */
export type PaymentStatus =
  | "success"
  | "failure"
  | "failed"
  | "pending"
  | "cancelled";

/**
 * Merchant-hosted API type
 */
export type MerchantApiType = "hosted";

/**
 * Merchant-hosted order mode
 */
export type MerchantOrderMode = "hosted" | "checkout";

/**
 * Merchant-hosted payment mode
 */
export type MerchantPaymentMode = "card" | "token";

/**
 * Configuration options for OMPAY client
 */
export interface OMPayConfig {
  /** Client ID from OMPAY merchant portal */
  clientId: string;
  /** Client Secret from OMPAY merchant portal */
  clientSecret: string;
  /** Environment: 'sandbox' or 'production' */
  environment?: Environment;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Optional merchant-hosted defaults */
  merchant?: MerchantConfig;
}

/**
 * Optional merchant-hosted defaults supplied at client creation time
 */
export interface MerchantConfig {
  /** Merchant domain used in signed requests */
  domain?: string;
  /** Browser fingerprint used in signed requests */
  browserFingerprint?: string;
  /** User agent used in signed requests */
  userAgent?: string;
  /** Optional merchant IP address */
  ipAddress?: string;
  /** Accept-Language header value */
  acceptLanguage?: string;
  /** AES-256-CBC encryption key from merchant dashboard as hex */
  cardEncryptionKey?: string;
}

/**
 * Per-request merchant-hosted context used to build signed headers
 */
export interface MerchantRequestContext {
  /** Browser fingerprint used for fraud checks */
  browserFingerprint?: string;
  /** User agent header value */
  userAgent?: string;
  /** Merchant domain */
  domain?: string;
  /** Optional merchant IP address */
  ipAddress?: string;
  /** Locale in BCP 47 format */
  acceptLanguage?: string;
}

/**
 * Customer information for order creation
 */
export interface CustomerFields {
  /** Customer's phone number */
  phone: string;
  /** Customer's email address */
  email: string;
  /** Customer's name */
  name: string;
}

/**
 * Legacy customer alias retained for compatibility
 */
export type CustomerInfo = CustomerFields;

/**
 * Request payload for creating a checkout order
 */
export interface CreateCheckoutRequest {
  /** Transaction amount (up to 2 decimal places, e.g., 500.00) */
  amount: number;
  /** Transaction currency (e.g., "OMR", "USD") */
  currency: string;
  /** UI mode for checkout */
  uiMode?: UIMode;
  /** Redirect type after payment */
  redirectType?: RedirectType;
  /** Legacy customer alias retained for compatibility */
  customer?: CustomerInfo;
  /** Customer fields expected by the gateway */
  customerFields?: CustomerFields;
  /** Optional receipt identifier */
  receiptId?: string;
  /** Optional order description */
  description?: string;
  /** Optional custom reference */
  curn?: string;
  /** Optional order reference alias retained for compatibility */
  orderReference?: string;
  /** Optional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Response from create checkout API
 */
export interface CreateCheckoutResponse {
  orderId: string;
  amount?: number | undefined;
  currency?: string | undefined;
  receiptId?: string | undefined;
  checkoutUrl?: string | undefined;
  status: PaymentStatus | string;
  resCode?: number | undefined;
  errMessage?: string | undefined;
  data?: Record<string, unknown> | undefined;
}

/**
 * Payment details from webhook/callback
 */
export interface PaymentDetails {
  /** Payment method used */
  paymentMethod?: string;
  /** Card network (Visa, Mastercard, etc.) */
  cardNetwork?: string;
  /** Card type (credit, debit) */
  cardType?: string;
  /** Card usage type (domestic, international, etc.) */
  cardUsageType?: string;
}

/**
 * Payment response from webhook/status check
 */
export interface PaymentResponse {
  /** Payment status */
  status: PaymentStatus | string;
  /** Order ID */
  orderId: string;
  /** Payment ID */
  paymentId?: string;
  /** Receipt ID */
  receiptId?: string;
  /** Signature for verification */
  signature?: string;
  /** Gateway timestamp */
  timestamp?: string;
  /** Payment details */
  paymentDetails?: PaymentDetails;
  /** Transaction amount */
  amount?: number;
  /** Transaction currency */
  currency?: string;
  /** Raw response data */
  data?: Record<string, unknown>;
}

/**
 * Options for checkout integration on client-side
 */
export interface CheckoutOptions {
  /** Order ID from create checkout response */
  orderId: string;
  /** Redirect URL after payment completion */
  redirectUrl: string;
  /** Optional client ID override */
  clientId?: string;
}

/**
 * Signature verification payload
 */
export interface SignaturePayload {
  /** Order ID */
  orderId: string;
  /** Payment ID */
  paymentId: string;
}

/**
 * Order status response
 */
export interface OrderStatusResponse {
  orderId: string;
  status: PaymentStatus | string;
  paymentId?: string | undefined;
  receiptId?: string | undefined;
  amount?: number | undefined;
  currency?: string | undefined;
  signature?: string | undefined;
  timestamp?: string | undefined;
  paymentDetails?: PaymentDetails | undefined;
  createdAt?: string | undefined;
  updatedAt?: string | undefined;
  data?: Record<string, unknown> | undefined;
}

/**
 * Merchant-hosted order creation request
 */
export interface MerchantOrderRequest {
  amount: number;
  currency: string;
  uiMode?: MerchantOrderMode;
  receiptId?: string;
  description?: string;
  customerFields: CustomerFields;
}

/**
 * Merchant-hosted order creation response
 */
export interface MerchantOrderResponse {
  orderId: string;
  receiptId?: string | undefined;
  amount?: number | undefined;
  currency?: string | undefined;
  status: PaymentStatus | string;
  resCode?: number | undefined;
  errMessage?: string | undefined;
  data?: Record<string, unknown> | undefined;
}

/**
 * Plain card details that should be AES encrypted before sending
 */
export interface MerchantCardDetails {
  cardNumber: string;
  cardExpMonth: string;
  cardExpYear: string;
  cardCVV: string;
}

/**
 * Tokenized card details that should be AES encrypted before sending
 */
export interface MerchantTokenCardDetails {
  digitalCardId: string;
  cardCVV?: string;
}

/**
 * Union of merchant card payloads accepted by card encryption helper
 */
export type MerchantEncryptedCardPayload =
  | MerchantCardDetails
  | MerchantTokenCardDetails;

/**
 * Merchant transaction initiation request
 */
export interface MerchantInitiateTransactionRequest {
  orderId: string;
  encryptedCardDetails: string;
  paymentMethod?: "card";
  cardHolderName: string;
  redirectionUrl: string;
  paymentMode: MerchantPaymentMode;
  secureCard?: boolean;
  skipCVVOnlyFlag?: boolean;
  skipCVVandOTP?: boolean;
  apiType?: MerchantApiType;
}

/**
 * Merchant redirect payload returned by transaction initiation
 */
export interface MerchantRedirectionData {
  method?: string | undefined;
  formData?: string | undefined;
}

/**
 * Tokenized card identifiers returned after secure card flows
 */
export interface MerchantSecuredCardDetails {
  customerId?: string | undefined;
  digitalCardId?: string | undefined;
}

/**
 * Merchant transaction initiation response
 */
export interface MerchantInitiateTransactionResponse {
  paymentId: string;
  orderId: string;
  receiptId?: string | undefined;
  paymentStatus?: PaymentStatus | string;
  amount?: number | undefined;
  currency?: string | undefined;
  redirectionData?: MerchantRedirectionData | undefined;
  securedCardDetails?: MerchantSecuredCardDetails | undefined;
  status: PaymentStatus | string;
  resCode?: number | undefined;
  errMessage?: string | undefined;
  data?: Record<string, unknown> | undefined;
}

/**
 * Merchant transaction status response
 */
export interface MerchantTransactionStatusResponse {
  paymentId: string;
  orderId: string;
  receiptId?: string | undefined;
  paymentStatus?: PaymentStatus | string;
  paymentMethod?: string | undefined;
  transactionType?: string | undefined;
  amount?: number | undefined;
  currency?: string | undefined;
  initiatedAt?: string | undefined;
  completedAt?: string | undefined;
  signature?: string | undefined;
  description?: string | undefined;
  paymentDetails?: PaymentDetails | undefined;
  status: PaymentStatus | string;
  resCode?: number | undefined;
  errMessage?: string | undefined;
  data?: Record<string, unknown> | undefined;
}

/**
 * Merchant refund request
 */
export interface MerchantRefundRequest {
  paymentId: string;
  amount: number;
}

/**
 * Merchant refund response
 */
export interface MerchantRefundResponse {
  refundId?: string | undefined;
  paymentId: string;
  orderId: string;
  receiptId?: string | undefined;
  paymentStatus?: PaymentStatus | string;
  paymentMethod?: string | undefined;
  amount?: number | undefined;
  currency?: string | undefined;
  initiatedAt?: string | undefined;
  completedAt?: string | undefined;
  signature?: string | undefined;
  status: PaymentStatus | string;
  resCode?: number | undefined;
  errMessage?: string | undefined;
  data?: Record<string, unknown> | undefined;
}

/**
 * Tokenized card summary
 */
export interface MerchantDigitalCard {
  digitalCardId: string;
  network?: string | undefined;
  cardType?: string | undefined;
  status?: string | undefined;
  panLastFour?: string | undefined;
  createdAt?: string | undefined;
  updatedAt?: string | undefined;
}

/**
 * Digital card list response
 */
export interface MerchantDigitalCardListResponse {
  digitalCards: MerchantDigitalCard[];
  remainingLimit?: number | undefined;
  status: PaymentStatus | string;
  resCode?: number | undefined;
  errMessage?: string | undefined;
  data?: Record<string, unknown> | undefined;
}

/**
 * Digital card deletion response
 */
export interface MerchantDeleteDigitalCardResponse {
  customerId?: string | undefined;
  digitalCardId?: string | undefined;
  status: PaymentStatus | string;
  resCode?: number | undefined;
  errMessage?: string | undefined;
  data?: Record<string, unknown> | undefined;
}
