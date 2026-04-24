import { createHmac } from "crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchMock = vi.fn();

vi.stubGlobal("fetch", fetchMock);

import { OMPayClient, OMPayError } from "../src/index.js";

function errorResponse(data: unknown, status: number) {
  return Promise.resolve({
    ok: false,
    status,
    headers: new Headers({ "content-type": "application/json" }),
    text: () => Promise.resolve(JSON.stringify(data)),
  });
}

describe("OMPayClient signatures and errors", () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  it("uses the official pipe-delimited signature format", () => {
    const client = new OMPayClient({
      clientId: "client-id",
      clientSecret: "client-secret",
    });

    const signature = createHmac("sha256", "client-secret")
      .update("wb-123|PAY-123")
      .digest("hex");

    expect(
      client.verifySignature(
        { orderId: "wb-123", paymentId: "PAY-123" },
        signature,
      ),
    ).toBe(true);
  });

  it("surfaces gateway errMessage values in validation errors", async () => {
    fetchMock.mockResolvedValueOnce(
      errorResponse(
        {
          errMessage: "Invalid order payload",
          resCode: 422,
          status: "failure",
        },
        422,
      ),
    );

    const client = new OMPayClient({
      clientId: "client-id",
      clientSecret: "client-secret",
    });

    await expect(
      client.createCheckout({
        amount: 500,
        currency: "OMR",
        customerFields: {
          name: "Jane Doe",
          email: "jane@example.com",
          phone: "91234567",
        },
      }),
    ).rejects.toMatchObject<Partial<OMPayError>>({
      code: "VALIDATION_ERROR",
      message: "Invalid order payload",
      statusCode: 422,
    });
  });

  it("builds signed merchant headers from api path and payload", () => {
    const client = new OMPayClient({
      clientId: "client-id",
      clientSecret: "client-secret",
      merchant: {
        browserFingerprint: "fingerprint-123",
        userAgent: "Mozilla/5.0",
        domain: "https://merchant.example.com",
        acceptLanguage: "en-US",
        ipAddress: "127.0.0.1",
      },
    });

    const payload = {
      amount: 100,
      currency: "OMR",
      customerFields: {
        name: "Jane Doe",
        email: "jane@example.com",
        phone: "91234567",
      },
      uiMode: "hosted",
    };

    const expectedSignature = createHmac("sha256", "client-secret")
      .update(`/order${JSON.stringify(payload)}`)
      .digest("hex");

    expect(client.buildMerchantHeaders("/order", undefined, payload)).toEqual({
      Authorization: "Basic Y2xpZW50LWlkOmNsaWVudC1zZWNyZXQ=",
      "Content-Type": "application/json",
      "Accept-Language": "en-US",
      "X-Signature": expectedSignature,
      "X-MERCHANT-BROWSER-FINGERPRINT": "fingerprint-123",
      "X-MERCHANT-USER-AGENT": "Mozilla/5.0",
      "X-MERCHANT-DOMAIN": "https://merchant.example.com",
      "X-MERCHANT-IP": "127.0.0.1",
    });
  });

  it("encrypts card details using iv.encryptedHex format", () => {
    const client = new OMPayClient({
      clientId: "client-id",
      clientSecret: "client-secret",
      merchant: {
        cardEncryptionKey:
          "00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff",
      },
    });

    const encrypted = client.encryptCardDetails({
      cardNumber: "4111111111111111",
      cardExpMonth: "02",
      cardExpYear: "27",
      cardCVV: "123",
    });

    expect(encrypted).toMatch(/^[0-9a-f]{32}\.[0-9a-f]+$/);
  });

  it("verifies webhook signatures using the raw message body", () => {
    const client = new OMPayClient({
      clientId: "client-id",
      clientSecret: "client-secret",
    });

    const message = JSON.stringify({ paymentId: "pay-123", status: "success" });
    const signature = createHmac("sha256", "client-secret")
      .update(message)
      .digest("hex");

    expect(client.verifyWebhookSignature(message, signature)).toBe(true);
  });
});
