import crypto from "crypto";

// Adyen configuration interface
export interface AdyenConfig {
  apiKey: string;
  merchantAccount: string;
  environment: "test" | "live";
  hmacKey?: string;
}

// Adyen API endpoints
export const getAdyenConfig = (): AdyenConfig => {
  const apiKey = process.env.APP_ADYEN_API_KEY;
  const merchantAccount = process.env.APP_ADYEN_MERCHANT_ACCOUNT;
  const environment = process.env.APP_ADYEN_ENVIRONMENT as "test" | "live" || "test";
  const hmacKey = process.env.APP_ADYEN_HMAC_KEY;

  if (!apiKey) {
    throw new Error("Adyen API key is not set in environment variables");
  }
  if (!merchantAccount) {
    throw new Error("Adyen merchant account is not set in environment variables");
  }

  return {
    apiKey,
    merchantAccount,
    environment,
    hmacKey,
  };
};

// Get Adyen API base URL
export const getAdyenApiUrl = (environment: string): string => {
  return environment === "live"
    ? "https://checkout-live.adyen.com/v71"
    : "https://checkout-test.adyen.com/v71";
};

// Generate Adyen API headers
export const getAdyenHeaders = (apiKey: string) => {
  return {
    "Content-Type": "application/json",
    "X-API-Key": apiKey,
  };
};

// Convert amount to Adyen minor units
export const convertToMinorUnits = (amount: number, currency: string): number => {
  // Currencies with no decimal places
  const zeroDecimalCurrencies = [
    "JPY", "KRW", "VND", "CLP", "PYG", "UGX", "RWF", "VUV", "XAF", "XOF", "XPF",
    "BIF", "CLP", "DJF", "GNF", "ISK", "KMF", "IDR", "CVE"
  ];
  
  // Currencies with 3 decimal places
  const threeDecimalCurrencies = ["BHD", "IQD", "JOD", "KWD", "LYD", "OMR", "TND"];

  if (zeroDecimalCurrencies.includes(currency)) {
    return Math.round(amount);
  } else if (threeDecimalCurrencies.includes(currency)) {
    return Math.round(amount * 1000);
  } else {
    // Most currencies have 2 decimal places
    return Math.round(amount * 100);
  }
};

// Convert from Adyen minor units to regular amount
export const convertFromMinorUnits = (amount: number, currency: string): number => {
  const zeroDecimalCurrencies = [
    "JPY", "KRW", "VND", "CLP", "PYG", "UGX", "RWF", "VUV", "XAF", "XOF", "XPF",
    "BIF", "CLP", "DJF", "GNF", "ISK", "KMF", "IDR", "CVE"
  ];
  
  const threeDecimalCurrencies = ["BHD", "IQD", "JOD", "KWD", "LYD", "OMR", "TND"];

  if (zeroDecimalCurrencies.includes(currency)) {
    return amount;
  } else if (threeDecimalCurrencies.includes(currency)) {
    return amount / 1000;
  } else {
    return amount / 100;
  }
};

// Verify HMAC signature for webhooks
export const verifyHmacSignature = (
  payload: string,
  signature: string,
  hmacKey: string
): boolean => {
  try {
    const hmac = crypto.createHmac("sha256", Buffer.from(hmacKey, "hex"));
    hmac.update(payload, "utf8");
    const computedSignature = hmac.digest("base64");
    
    return computedSignature === signature;
  } catch (error) {
    console.error("Error verifying HMAC signature:", error);
    return false;
  }
};

// Adyen payment request interface
export interface AdyenPaymentRequest {
  amount: {
    value: number;
    currency: string;
  };
  reference: string;
  merchantAccount: string;
  returnUrl: string;
  countryCode?: string;
  shopperEmail?: string;
  shopperReference?: string;
  channel: "Web";
}

// Adyen session request interface
export interface AdyenSessionRequest {
  amount: {
    value: number;
    currency: string;
  };
  reference: string;
  merchantAccount: string;
  returnUrl: string;
  countryCode?: string;
  shopperEmail?: string;
  shopperReference?: string;
  channel: "Web";
}

// Adyen payment response interface
export interface AdyenPaymentResponse {
  pspReference: string;
  resultCode: string;
  action?: any;
  additionalData?: any;
  amount?: {
    value: number;
    currency: string;
  };
  merchantReference?: string;
}

// Adyen session response interface
export interface AdyenSessionResponse {
  id: string;
  sessionData: string;
  amount: {
    value: number;
    currency: string;
  };
  expiresAt: string;
  reference: string;
  returnUrl: string;
  merchantAccount: string;
  countryCode?: string;
}

// Make API request to Adyen
export const makeAdyenApiRequest = async (
  endpoint: string,
  data: any,
  config: AdyenConfig
): Promise<any> => {
  const baseUrl = getAdyenApiUrl(config.environment);
  const headers = getAdyenHeaders(config.apiKey);

  const response = await fetch(`${baseUrl}${endpoint}`, {
    method: "POST",
    headers,
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `Adyen API error: ${response.status} - ${errorData.message || response.statusText}`
    );
  }

  return response.json();
}; 