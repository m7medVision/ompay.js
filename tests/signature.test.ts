import { describe, it, expect } from "vitest";
import { createHmac } from "crypto";
import { OMPayClient, OMPayError } from "../src/index.js";

describe("Signature Verification", () => {
  const validConfig = {
    clientId: "test-client-id",
    clientSecret: "my-super-secret-key",
    environment: "sandbox" as const,
  };

  describe("verifySignature", () => {
    it("should return true for valid signature", () => {
      const client = new OMPayClient(validConfig);

      const orderId = "wb-e883b28d-0cd3-455d-9903-ef5d3d8ddf27";
      const paymentId = "pay-123456789";
      const dataToSign = `${orderId}/${paymentId}`;
      const validSignature = createHmac("sha256", "my-super-secret-key")
        .update(dataToSign)
        .digest("hex");

      const result = client.verifySignature(
        { orderId, paymentId },
        validSignature,
      );

      expect(result).toBe(true);
    });

    it("should return false for invalid signature", () => {
      const client = new OMPayClient(validConfig);

      const result = client.verifySignature(
        {
          orderId: "wb-e883b28d-0cd3-455d-9903-ef5d3d8ddf27",
          paymentId: "pay-123456789",
        },
        "invalid-signature",
      );

      expect(result).toBe(false);
    });

    it("should throw error when orderId is missing", () => {
      const client = new OMPayClient(validConfig);

      expect(() =>
        client.verifySignature(
          { orderId: "", paymentId: "pay-123456789" },
          "some-signature",
        ),
      ).toThrow("orderId and paymentId are required");
    });

    it("should throw error when paymentId is missing", () => {
      const client = new OMPayClient(validConfig);

      expect(() =>
        client.verifySignature(
          { orderId: "order-123", paymentId: "" },
          "some-signature",
        ),
      ).toThrow("orderId and paymentId are required");
    });

    it("should throw error when signature is missing", () => {
      const client = new OMPayClient(validConfig);

      expect(() =>
        client.verifySignature(
          { orderId: "order-123", paymentId: "pay-123" },
          "",
        ),
      ).toThrow("signature is required");
    });
  });

  describe("verifySignatureOrThrow", () => {
    it("should not throw for valid signature", () => {
      const client = new OMPayClient(validConfig);

      const orderId = "wb-e883b28d-0cd3-455d-9903-ef5d3d8ddf27";
      const paymentId = "pay-123456789";
      const dataToSign = `${orderId}/${paymentId}`;
      const validSignature = createHmac("sha256", "my-super-secret-key")
        .update(dataToSign)
        .digest("hex");

      expect(() =>
        client.verifySignatureOrThrow({ orderId, paymentId }, validSignature),
      ).not.toThrow();
    });

    it("should throw OMPayError for invalid signature", () => {
      const client = new OMPayClient(validConfig);

      expect(() =>
        client.verifySignatureOrThrow(
          {
            orderId: "wb-e883b28d-0cd3-455d-9903-ef5d3d8ddf27",
            paymentId: "pay-123456789",
          },
          "invalid-signature",
        ),
      ).toThrow(OMPayError);
    });

    it("should throw with SIGNATURE_MISMATCH code", () => {
      const client = new OMPayClient(validConfig);

      try {
        client.verifySignatureOrThrow(
          {
            orderId: "order-123",
            paymentId: "pay-123",
          },
          "invalid-signature",
        );
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(OMPayError);
        expect((error as OMPayError).code).toBe("SIGNATURE_MISMATCH");
      }
    });
  });
});
