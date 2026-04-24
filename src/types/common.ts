/**
 * OMPAY SDK Types - Common
 * @module ompay-sdk/types/common
 */

export type Environment = "sandbox" | "production";

export type UIMode = "checkout";

export type RedirectType = "post" | "redirect";

export type PaymentStatus =
  | "success"
  | "failure"
  | "failed"
  | "pending"
  | "cancelled";

export type MerchantApiType = "hosted";

export type MerchantOrderMode = "hosted" | "checkout";

export type MerchantPaymentMode = "card" | "token";

export interface OMPayConfig {
  clientId: string;
  clientSecret: string;
  environment?: Environment;
  timeout?: number;
  merchant?: MerchantConfig;
}

export interface MerchantConfig {
  domain?: string;
  browserFingerprint?: string;
  userAgent?: string;
  ipAddress?: string;
  acceptLanguage?: string;
  cardEncryptionKey?: string;
}

export interface MerchantRequestContext {
  browserFingerprint?: string;
  userAgent?: string;
  domain?: string;
  ipAddress?: string;
  acceptLanguage?: string;
}

export interface CustomerFields {
  phone: string;
  email: string;
  name: string;
}

export type CustomerInfo = CustomerFields;

export interface CheckoutOptions {
  orderId: string;
  redirectUrl: string;
  clientId?: string;
}

export interface SignaturePayload {
  orderId: string;
  paymentId: string;
}

export interface PaymentDetails {
  paymentMethod?: string;
  cardNetwork?: string;
  cardType?: string;
  cardUsageType?: string;
}
