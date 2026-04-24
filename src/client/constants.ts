import type { Environment } from "../types/index.js";

export const API_URLS: Record<Environment, string> = {
  sandbox: "https://api.uat.gateway.ompay.com",
  production: "https://api.gateway.ompay.com",
};

export const CHECKOUT_URLS: Record<Environment, string> = {
  sandbox: "https://merchant.uat.gateway.ompay.com/cpbs/pg",
  production: "https://merchant.gateway.ompay.com/cpbs/pg",
};

export const DEFAULT_TIMEOUT = 30000;
