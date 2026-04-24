/**
 * OMPAY SDK Types - Merchant
 * @module ompay-sdk/types/merchant
 */

import type {
  MerchantOrderMode,
  MerchantPaymentMode,
  MerchantApiType,
  PaymentStatus,
  CustomerFields,
  PaymentDetails,
} from "./common.js";

export interface MerchantOrderRequest {
  amount: number;
  currency: string;
  uiMode?: MerchantOrderMode;
  receiptId?: string;
  description?: string;
  customerFields: CustomerFields;
}

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

export interface MerchantCardDetails {
  cardNumber: string;
  cardExpMonth: string;
  cardExpYear: string;
  cardCVV: string;
}

export interface MerchantTokenCardDetails {
  digitalCardId: string;
  cardCVV?: string;
}

export type MerchantEncryptedCardPayload =
  | MerchantCardDetails
  | MerchantTokenCardDetails;

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

export interface MerchantRedirectionData {
  method?: string | undefined;
  formData?: string | undefined;
}

export interface MerchantSecuredCardDetails {
  customerId?: string | undefined;
  digitalCardId?: string | undefined;
}

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

export interface MerchantRefundRequest {
  paymentId: string;
  amount: number;
}

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

export interface MerchantDigitalCard {
  digitalCardId: string;
  network?: string | undefined;
  cardType?: string | undefined;
  status?: string | undefined;
  panLastFour?: string | undefined;
  createdAt?: string | undefined;
  updatedAt?: string | undefined;
}

export interface MerchantDigitalCardListResponse {
  digitalCards: MerchantDigitalCard[];
  remainingLimit?: number | undefined;
  status: PaymentStatus | string;
  resCode?: number | undefined;
  errMessage?: string | undefined;
  data?: Record<string, unknown> | undefined;
}

export interface MerchantDeleteDigitalCardResponse {
  customerId?: string | undefined;
  digitalCardId?: string | undefined;
  status: PaymentStatus | string;
  resCode?: number | undefined;
  errMessage?: string | undefined;
  data?: Record<string, unknown> | undefined;
}
