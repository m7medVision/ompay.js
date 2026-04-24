/**
 * OMPAY SDK Types - Checkout
 * @module ompay-sdk/types/checkout
 */

import type {
  UIMode,
  RedirectType,
  CustomerInfo,
  CustomerFields,
  PaymentStatus,
  PaymentDetails,
} from "./common.js";

export interface CreateCheckoutRequest {
  amount: number;
  currency: string;
  uiMode?: UIMode;
  redirectType?: RedirectType;
  customer?: CustomerInfo;
  customerFields?: CustomerFields;
  receiptId?: string;
  description?: string;
  curn?: string;
  orderReference?: string;
  metadata?: Record<string, unknown>;
}

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

export interface PaymentResponse {
  status: PaymentStatus | string;
  orderId: string;
  paymentId?: string;
  receiptId?: string;
  signature?: string;
  timestamp?: string;
  paymentDetails?: PaymentDetails;
  amount?: number;
  currency?: string;
  data?: Record<string, unknown>;
}

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
