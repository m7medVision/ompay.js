import { createHmac } from "crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchMock = vi.fn();

vi.stubGlobal("fetch", fetchMock);

import { OMPayClient } from "../src/index.js";

function jsonResponse(data: unknown, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers({ "content-type": "application/json" }),
    text: () => Promise.resolve(JSON.stringify(data)),
  });
}

describe("OMPayClient merchant-hosted flows", () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  it("creates merchant-hosted orders with signed headers", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        resCode: 200,
        status: "success",
        data: {
          orderId: "wb-merchant-1",
          receiptId: "INV-1",
          amount: 100,
          currency: "OMR",
        },
      }),
    );

    const client = new OMPayClient({
      clientId: "client-id",
      clientSecret: "client-secret",
      merchant: {
        browserFingerprint: "fingerprint-123",
        userAgent: "Mozilla/5.0",
        domain: "https://merchant.example.com",
      },
    });

    const payload = {
      amount: 100,
      currency: "OMR",
      description: "Hosted order",
      customerFields: {
        name: "Jane Doe",
        email: "jane@example.com",
        phone: "91234567",
      },
      uiMode: "hosted",
      receiptId: "INV-1",
    };

    const response = await client.createOrder({
      amount: 100,
      currency: "OMR",
      description: "Hosted order",
      receiptId: "INV-1",
      customerFields: {
        name: "Jane Doe",
        email: "jane@example.com",
        phone: "91234567",
      },
    });

    const [, options] = fetchMock.mock.calls[0];

    expect(options.headers).toEqual(
      expect.objectContaining({
        "X-Signature": createHmac("sha256", "client-secret")
          .update(`/order${JSON.stringify(payload)}`)
          .digest("hex"),
      }),
    );

    expect(response).toMatchObject({
      orderId: "wb-merchant-1",
      receiptId: "INV-1",
      amount: 100,
      currency: "OMR",
      status: "success",
      resCode: 200,
    });
  });

  it("maps merchant transaction initiation responses", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        resCode: 200,
        status: "success",
        data: {
          paymentId: "pay-123",
          orderId: "wb-merchant-1",
          receiptId: "INV-1",
          paymentStatus: "pending",
          amount: 100,
          currency: "OMR",
          redirectionData: {
            method: "POST",
            formData: "<form></form>",
          },
          securedCardDetails: {
            customerId: "cust-1",
            digitalCardId: "card-1",
          },
        },
      }),
    );

    const client = new OMPayClient({
      clientId: "client-id",
      clientSecret: "client-secret",
      merchant: {
        browserFingerprint: "fingerprint-123",
        userAgent: "Mozilla/5.0",
        domain: "https://merchant.example.com",
      },
    });

    const response = await client.initiateTransaction({
      orderId: "wb-merchant-1",
      encryptedCardDetails: "iv.payload",
      cardHolderName: "Jane Doe",
      redirectionUrl: "https://merchant.example.com/return",
      paymentMode: "card",
      secureCard: true,
    });

    expect(response).toMatchObject({
      paymentId: "pay-123",
      orderId: "wb-merchant-1",
      receiptId: "INV-1",
      paymentStatus: "pending",
      amount: 100,
      currency: "OMR",
      redirectionData: {
        method: "POST",
        formData: "<form></form>",
      },
      securedCardDetails: {
        customerId: "cust-1",
        digitalCardId: "card-1",
      },
    });
  });

  it("maps merchant transaction status responses", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        resCode: 200,
        status: "success",
        data: {
          paymentId: "pay-123",
          orderId: "wb-merchant-1",
          receiptId: "INV-1",
          paymentStatus: "pending",
          paymentMethod: "card",
          transactionType: "sales",
          amount: "1.000",
          currency: "OMR",
          initiatedAt: "2025-05-29T07:21:19.845Z",
          completedAt: "2025-05-29T07:21:19.846Z",
          signature: "deadbeef",
          description: "Transaction pending",
          paymentDetails: {
            cardNetwork: "visa",
            cardType: "credit",
            cardUsageType: "domestic",
          },
        },
      }),
    );

    const client = new OMPayClient({
      clientId: "client-id",
      clientSecret: "client-secret",
      merchant: {
        browserFingerprint: "fingerprint-123",
        userAgent: "Mozilla/5.0",
        domain: "https://merchant.example.com",
      },
    });

    const response = await client.getTransactionStatus("pay-123");

    const [, options] = fetchMock.mock.calls[0];

    expect(options.headers).toEqual(
      expect.objectContaining({
        "X-Signature": createHmac("sha256", "client-secret")
          .update("/transaction/status/pay-123")
          .digest("hex"),
      }),
    );

    expect(response).toMatchObject({
      paymentId: "pay-123",
      orderId: "wb-merchant-1",
      receiptId: "INV-1",
      paymentStatus: "pending",
      paymentMethod: "card",
      transactionType: "sales",
      amount: 1,
      currency: "OMR",
      initiatedAt: "2025-05-29T07:21:19.845Z",
      completedAt: "2025-05-29T07:21:19.846Z",
      signature: "deadbeef",
      description: "Transaction pending",
      paymentDetails: {
        cardNetwork: "visa",
        cardType: "credit",
        cardUsageType: "domestic",
      },
    });
  });

  it("maps merchant refund and digital card responses", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        resCode: 200,
        status: "success",
        data: {
          refundId: "ref-1",
          paymentId: "pay-123",
          orderId: "wb-merchant-1",
          receiptId: "INV-1",
          paymentStatus: "success",
          paymentMethod: "card",
          amount: 100,
          currency: "OMR",
          initiatedAt: "2025-05-29T07:21:19.845Z",
          compltedAt: "2025-05-29T07:21:19.846Z",
          signarture: "deadbeef",
        },
      }),
    );
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        resCode: 200,
        status: "success",
        data: {
          digitalCards: [
            {
              digitalCardId: "card-1",
              network: "visa",
              cardType: "credit",
              status: "ACTIVE",
              panLastFour: "1111",
              createdAt: "2025-06-24T06:13:47.869Z",
              updatedAt: "2025-06-24T06:13:47.869Z",
            },
          ],
          remainingLimit: 4,
        },
      }),
    );
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        resCode: 200,
        status: "success",
        data: {
          customerId: "cust-1",
          digitalCardId: "card-1",
        },
      }),
    );

    const client = new OMPayClient({
      clientId: "client-id",
      clientSecret: "client-secret",
      merchant: {
        browserFingerprint: "fingerprint-123",
        userAgent: "Mozilla/5.0",
        domain: "https://merchant.example.com",
      },
    });

    await expect(
      client.refundTransaction({ paymentId: "pay-123", amount: 100 }),
    ).resolves.toMatchObject({
      refundId: "ref-1",
      paymentId: "pay-123",
      orderId: "wb-merchant-1",
      paymentStatus: "success",
      completedAt: "2025-05-29T07:21:19.846Z",
      signature: "deadbeef",
    });

    await expect(client.listDigitalCards("cust-1")).resolves.toMatchObject({
      digitalCards: [
        {
          digitalCardId: "card-1",
          network: "visa",
          cardType: "credit",
          status: "ACTIVE",
          panLastFour: "1111",
        },
      ],
      remainingLimit: 4,
    });

    await expect(
      client.deleteDigitalCard("cust-1", "card-1"),
    ).resolves.toMatchObject({
      customerId: "cust-1",
      digitalCardId: "card-1",
      status: "success",
    });
  });
});
