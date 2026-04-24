import { beforeEach, describe, expect, it, vi } from "vitest";

const { axiosCreateMock, getMock, postMock } = vi.hoisted(() => {
  const postMock = vi.fn();
  const getMock = vi.fn();
  const axiosCreateMock = vi.fn(() => ({
    post: postMock,
    get: getMock,
    delete: vi.fn(),
  }));

  return { axiosCreateMock, getMock, postMock };
});

vi.mock("axios", () => ({
  default: {
    create: axiosCreateMock,
  },
}));

import { OMPayClient } from "../src/index.js";

describe("OMPayClient bank-hosted flows", () => {
  beforeEach(() => {
    axiosCreateMock.mockClear();
    getMock.mockReset();
    postMock.mockReset();
  });

  it("maps bank-hosted checkout requests to customerFields payload", async () => {
    postMock.mockResolvedValue({
      data: {
        orderId: "wb-123",
        amount: 500,
        currency: "OMR",
        receiptId: "INV-123",
        status: "success",
        resCode: 200,
      },
    });

    const client = new OMPayClient({
      clientId: "client-id",
      clientSecret: "client-secret",
    });

    const response = await client.createCheckout({
      amount: 500,
      currency: "OMR",
      customer: {
        name: "Jane Doe",
        email: "jane@example.com",
        phone: "91234567",
      },
      description: "SDK test order",
      orderReference: "INV-123",
      curn: "CURN-123",
    });

    expect(postMock).toHaveBeenCalledWith(
      "/nac/api/v1/pg/orders/create-checkout",
      {
        amount: 500,
        currency: "OMR",
        uiMode: "checkout",
        redirectType: "redirect",
        customerFields: {
          name: "Jane Doe",
          email: "jane@example.com",
          phone: "91234567",
        },
        description: "SDK test order",
        receiptId: "INV-123",
        curn: "CURN-123",
      },
    );

    expect(response).toMatchObject({
      orderId: "wb-123",
      amount: 500,
      currency: "OMR",
      receiptId: "INV-123",
      status: "success",
      resCode: 200,
    });
  });

  it("maps bank-hosted status responses using documented fields", async () => {
    getMock.mockResolvedValue({
      data: {
        orderId: "wb-123",
        status: "failure",
        paymentId: "PAY-123",
        receiptId: "INV-123",
        amount: 500,
        currency: "OMR",
        signature: "deadbeef",
        timestamp: "2025-04-10T13:42:54.563Z",
        paymentDetails: {
          paymentMethod: "card",
          cardNetwork: "visa",
          cardType: "credit",
        },
      },
    });

    const client = new OMPayClient({
      clientId: "client-id",
      clientSecret: "client-secret",
    });

    const response = await client.checkStatus("wb-123");

    expect(getMock).toHaveBeenCalledWith(
      "/nac/api/v1/pg/orders/check-status",
      { params: { orderId: "wb-123" } },
    );

    expect(response).toMatchObject({
      orderId: "wb-123",
      status: "failure",
      paymentId: "PAY-123",
      receiptId: "INV-123",
      amount: 500,
      currency: "OMR",
      signature: "deadbeef",
      timestamp: "2025-04-10T13:42:54.563Z",
      paymentDetails: {
        paymentMethod: "card",
        cardNetwork: "visa",
        cardType: "credit",
      },
    });
  });

  it("builds the correct hosted checkout redirect URL", () => {
    const client = new OMPayClient({
      clientId: "client-id",
      clientSecret: "client-secret",
      environment: "sandbox",
    });

    expect(
      client.buildCheckoutUrl("wb-123", "https://example.com/return"),
    ).toBe(
      "https://merchant.uat.gateway.ompay.com/cpbs/pg?actionType=checkout&orderId=wb-123&redirectUrl=https%3A%2F%2Fexample.com%2Freturn&clientId=client-id",
    );
  });
});
