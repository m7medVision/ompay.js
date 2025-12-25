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
export type PaymentStatus = "success" | "failed" | "pending" | "cancelled";

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
}

/**
 * Customer information for order creation
 */
export interface CustomerInfo {
  /** Customer's phone number */
  phone: string;
  /** Customer's email address */
  email: string;
  /** Customer's name */
  name: string;
}

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
  /** Customer information */
  customer: CustomerInfo;
  /** Optional order reference from your system */
  orderReference?: string;
  /** Optional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Response from create checkout API
 */
export interface CreateCheckoutResponse {
  orderId: string;
  checkoutUrl?: string | undefined;
  status: string;
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
}

/**
 * Payment response from webhook/status check
 */
export interface PaymentResponse {
  /** Payment status */
  status: PaymentStatus;
  /** Order ID */
  orderId: string;
  /** Payment ID */
  paymentId?: string;
  /** Signature for verification */
  signature?: string;
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
  /** Client ID */
  clientId: string;
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
  status: PaymentStatus;
  paymentId?: string | undefined;
  amount?: number | undefined;
  currency?: string | undefined;
  paymentDetails?: PaymentDetails | undefined;
  createdAt?: string | undefined;
  updatedAt?: string | undefined;
  data?: Record<string, unknown> | undefined;
}
