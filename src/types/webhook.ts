/**
 * OMPAY SDK Types - Webhooks
 * @module ompay-sdk/types/webhook
 */

import type { PaymentDetails, PaymentStatus } from "./common.js";

export type WebhookEventType =
  | "TRANSACTION_COMPLETED"
  | "TRANSACTION_FAILED"
  | "REFUND_SUCCESS"
  | "REFUND_FAILED";

export interface WebhookDataBase {
  paymentId: string;
  orderId: string;
  receiptId?: string | undefined;
  paymentStatus: PaymentStatus | string;
  paymentMethod?: string | undefined;
  amount: string;
  currency: string;
  initiatedAt: string;
  completedAt: string;
  signature: string;
  description?: string | undefined;
}

export interface TransactionWebhookData extends WebhookDataBase {
  transactionType: string;
  paymentDetails?: PaymentDetails | undefined;
}

export interface RefundWebhookData extends WebhookDataBase {
  refundId: string;
}

export interface TransactionCompletedWebhook {
  eventType: "TRANSACTION_COMPLETED";
  data: TransactionWebhookData;
}

export interface TransactionFailedWebhook {
  eventType: "TRANSACTION_FAILED";
  data: TransactionWebhookData;
}

export interface RefundSuccessWebhook {
  eventType: "REFUND_SUCCESS";
  data: RefundWebhookData;
}

export interface RefundFailedWebhook {
  eventType: "REFUND_FAILED";
  data: RefundWebhookData;
}

export type OMPayWebhookEvent =
  | TransactionCompletedWebhook
  | TransactionFailedWebhook
  | RefundSuccessWebhook
  | RefundFailedWebhook;
