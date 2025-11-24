import * as crypto from "crypto";

// Authorize.Net Configuration
export interface AuthorizeNetConfig {
  apiLoginId: string;
  transactionKey: string;
  environment: "sandbox" | "production";
  signatureKey?: string;
}

export function getAuthorizeNetConfig(): AuthorizeNetConfig {
  const apiLoginId = process.env.APP_AUTHORIZENET_API_LOGIN_ID;
  const transactionKey = process.env.APP_AUTHORIZENET_TRANSACTION_KEY;
  const environment = process.env.NODE_ENV === "production" ? "production" : "sandbox";
  const signatureKey = process.env.APP_AUTHORIZENET_SIGNATURE_KEY;

  if (!apiLoginId || !transactionKey) {
    throw new Error("Authorize.Net API credentials are not set in environment variables");
  }

  return {
    apiLoginId,
    transactionKey,
    environment,
    signatureKey,
  };
}

export function getAuthorizeNetEndpoint(environment: "sandbox" | "production"): string {
  return environment === "production" 
    ? "https://api.authorize.net/xml/v1/request.api"
    : "https://apitest.authorize.net/xml/v1/request.api";
}

export function getAcceptHostedEndpoint(environment: "sandbox" | "production"): string {
  return environment === "production"
    ? "https://accept.authorize.net/payment/payment"
    : "https://test.authorize.net/payment/payment";
}

// Helper function to verify webhook signature
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  signatureKey: string
): boolean {
  if (!signatureKey) {
    console.warn("Authorize.Net signature key not configured, skipping verification");
    return true;
  }

  const hash = crypto
    .createHmac("sha512", signatureKey)
    .update(payload)
    .digest("hex")
    .toUpperCase();

  // Authorize.Net sends signature in format "sha512=HASH"
  const expectedSignature = `sha512=${hash}`;
  return expectedSignature === signature;
}

// API request interfaces
export interface AuthorizeNetMerchantAuthentication {
  name: string;
  transactionKey: string;
}

export interface AuthorizeNetTransactionRequest {
  transactionType: string;
  amount: string;
  currencyCode?: string;
  customer?: {
    id?: string;
    email?: string;
  };
  billTo?: {
    firstName?: string;
    lastName?: string;
    company?: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  };
  order?: {
    invoiceNumber?: string;
    description?: string;
  };
}

export interface AuthorizeNetHostedPaymentSettings {
  setting: Array<{
    settingName: string;
    settingValue: string;
  }>;
}

export interface GetHostedPaymentPageRequest {
  merchantAuthentication: AuthorizeNetMerchantAuthentication;
  refId?: string;
  transactionRequest: AuthorizeNetTransactionRequest;
  hostedPaymentSettings: AuthorizeNetHostedPaymentSettings;
}

export interface CreateTransactionRequest {
  merchantAuthentication: AuthorizeNetMerchantAuthentication;
  refId?: string;
  transactionRequest: AuthorizeNetTransactionRequest;
}

// API response interfaces
export interface AuthorizeNetMessage {
  code: string;
  text: string;
}

export interface AuthorizeNetMessages {
  resultCode: "Ok" | "Error";
  message: AuthorizeNetMessage[];
}

export interface GetHostedPaymentPageResponse {
  token?: string;
  messages: AuthorizeNetMessages;
}

export interface AuthorizeNetTransactionResponse {
  responseCode: string;
  authCode?: string;
  avsResultCode?: string;
  cvvResultCode?: string;
  cavvResultCode?: string;
  transId?: string;
  refTransID?: string;
  transHash?: string;
  testRequest?: string;
  accountNumber?: string;
  accountType?: string;
  messages?: AuthorizeNetMessage[];
  transHashSha2?: string;
  networkTransId?: string;
}

export interface CreateTransactionResponse {
  transactionResponse?: AuthorizeNetTransactionResponse;
  refId?: string;
  messages: AuthorizeNetMessages;
}

// Helper function to make API requests to Authorize.Net
export async function makeAuthorizeNetRequest<T>(
  request: any,
  config: AuthorizeNetConfig
): Promise<T> {
  const endpoint = getAuthorizeNetEndpoint(config.environment);
  
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`Authorize.Net API request failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data as T;
}

// Helper function to generate hosted payment settings
export function generateHostedPaymentSettings(options: {
  returnUrl: string;
  cancelUrl: string;
  showReceipt?: boolean;
  iframeCommunicatorUrl?: string;
}): AuthorizeNetHostedPaymentSettings {
  const settings = [
    {
      settingName: "hostedPaymentReturnOptions",
      settingValue: JSON.stringify({
        showReceipt: options.showReceipt ?? false,
        url: options.returnUrl,
        urlText: "Continue",
        cancelUrl: options.cancelUrl,
        cancelUrlText: "Cancel",
      }),
    },
    {
      settingName: "hostedPaymentButtonOptions",
      settingValue: JSON.stringify({
        text: "Pay Now",
      }),
    },
    {
      settingName: "hostedPaymentStyleOptions",
      settingValue: JSON.stringify({
        bgColor: "#1f2937",
      }),
    },
    {
      settingName: "hostedPaymentPaymentOptions",
      settingValue: JSON.stringify({
        cardCodeRequired: true,
        showCreditCard: true,
        showBankAccount: false,
      }),
    },
    {
      settingName: "hostedPaymentSecurityOptions",
      settingValue: JSON.stringify({
        captcha: false,
      }),
    },
    {
      settingName: "hostedPaymentBillingAddressOptions",
      settingValue: JSON.stringify({
        show: true,
        required: false,
      }),
    },
    {
      settingName: "hostedPaymentShippingAddressOptions",
      settingValue: JSON.stringify({
        show: false,
        required: false,
      }),
    },
    {
      settingName: "hostedPaymentCustomerOptions",
      settingValue: JSON.stringify({
        showEmail: false,
        requiredEmail: false,
      }),
    },
  ];

  if (options.iframeCommunicatorUrl) {
    settings.push({
      settingName: "hostedPaymentIFrameCommunicatorUrl",
      settingValue: JSON.stringify({
        url: options.iframeCommunicatorUrl,
      }),
    });
  }

  return { setting: settings };
}

// Webhook payload interfaces
export interface AuthorizeNetWebhookPayload {
  notificationId: string;
  eventType: string;
  eventDate: string;
  webhookId: string;
  payload: {
    responseCode: number;
    authCode?: string;
    avsResponse?: string;
    authAmount: number;
    entityName: string;
    id: string;
    merchantReferenceId?: string;
  };
} 