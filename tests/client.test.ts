import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import axios from "axios";
import { OMPayClient, OMPayError } from "../src/index.js";

vi.mock("axios");

const mockedAxios = vi.mocked(axios);

describe("OMPayClient", () => {
  const validConfig = {
    clientId: "test-client-id",
    clientSecret: "test-client-secret",
    environment: "sandbox" as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockedAxios.create.mockReturnValue({
      post: vi.fn(),
      get: vi.fn(),
    } as unknown as ReturnType<typeof axios.create>);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("constructor", () => {
    it("should create client with valid config", () => {
      const client = new OMPayClient(validConfig);

      expect(client).toBeInstanceOf(OMPayClient);
      expect(client.getClientId()).toBe("test-client-id");
      expect(client.getEnvironment()).toBe("sandbox");
    });

    it("should use sandbox environment by default", () => {
      const client = new OMPayClient({
        clientId: "test-client-id",
        clientSecret: "test-client-secret",
      });

      expect(client.getEnvironment()).toBe("sandbox");
    });

    it("should set production environment when specified", () => {
      const client = new OMPayClient({
        ...validConfig,
        environment: "production",
      });

      expect(client.getEnvironment()).toBe("production");
      expect(client.getBaseUrl()).toBe("https://api.gateway.ompay.com");
    });

    it("should throw error when clientId is missing", () => {
      expect(() => {
        new OMPayClient({
          clientId: "",
          clientSecret: "test-secret",
        });
      }).toThrow(OMPayError);
    });

    it("should throw error when clientSecret is missing", () => {
      expect(() => {
        new OMPayClient({
          clientId: "test-id",
          clientSecret: "",
        });
      }).toThrow(OMPayError);
    });

    it("should throw error for invalid environment", () => {
      expect(() => {
        new OMPayClient({
          clientId: "test-id",
          clientSecret: "test-secret",
          environment: "invalid" as "sandbox",
        });
      }).toThrow(OMPayError);
    });
  });

  describe("createCheckout", () => {
    it("should throw error when amount is not positive", async () => {
      const client = new OMPayClient(validConfig);
      await expect(
        client.createCheckout({
          amount: 0,
          currency: "OMR",
          customer: {
            phone: "+96891234567",
            email: "test@example.com",
            name: "Test User",
          },
        }),
      ).rejects.toThrow("amount must be a positive number");
    });

    it("should throw error when currency is missing", async () => {
      const client = new OMPayClient(validConfig);

      await expect(
        client.createCheckout({
          amount: 100,
          currency: "",
          customer: {
            phone: "+96891234567",
            email: "test@example.com",
            name: "Test User",
          },
        }),
      ).rejects.toThrow("currency is required");
    });

    it("should throw error when customer info is incomplete", async () => {
      const client = new OMPayClient(validConfig);

      await expect(
        client.createCheckout({
          amount: 100,
          currency: "OMR",
          customer: {
            phone: "+96891234567",
            email: "",
            name: "Test User",
          },
        }),
      ).rejects.toThrow("customer phone, email, and name are required");
    });
  });

  describe("checkStatus", () => {
    it("should throw error when orderId is missing", async () => {
      const client = new OMPayClient(validConfig);

      await expect(client.checkStatus("")).rejects.toThrow(
        "orderId is required",
      );
    });
  });

  describe("getBaseUrl", () => {
    it("should return sandbox URL for sandbox environment", () => {
      const client = new OMPayClient({
        ...validConfig,
        environment: "sandbox",
      });

      expect(client.getBaseUrl()).toBe("https://api.uat.gateway.ompay.com");
    });

    it("should return production URL for production environment", () => {
      const client = new OMPayClient({
        ...validConfig,
        environment: "production",
      });

      expect(client.getBaseUrl()).toBe("https://api.gateway.ompay.com");
    });
  });
});
