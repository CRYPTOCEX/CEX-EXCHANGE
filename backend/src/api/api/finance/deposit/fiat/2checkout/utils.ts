import crypto from "crypto";

const TWOCHECKOUT_MERCHANT_CODE = process.env.APP_2CHECKOUT_MERCHANT_CODE;
const TWOCHECKOUT_SECRET_KEY = process.env.APP_2CHECKOUT_SECRET_KEY;
const TWOCHECKOUT_ACCOUNT_REFERENCE = process.env.APP_2CHECKOUT_ACCOUNT_REFERENCE;

export interface TwoCheckoutConfig {
  merchantCode: string;
  secretKey: string;
  accountReference: string;
  isProduction: boolean;
}

export const use2Checkout = (): TwoCheckoutConfig => {
  if (!TWOCHECKOUT_MERCHANT_CODE || !TWOCHECKOUT_SECRET_KEY) {
    throw new Error("2Checkout credentials are not set in environment variables.");
  }

  return {
    merchantCode: TWOCHECKOUT_MERCHANT_CODE,
    secretKey: TWOCHECKOUT_SECRET_KEY,
    accountReference: TWOCHECKOUT_ACCOUNT_REFERENCE || "",
    isProduction: process.env.NODE_ENV === "production",
  };
};

export const get2CheckoutApiUrl = (isProduction: boolean): string => {
  return isProduction 
    ? "https://api.2checkout.com" 
    : "https://api.2checkout.com"; // 2Checkout uses same URL for sandbox/live, differentiated by credentials
};

export const generate2CheckoutSignature = (
  params: Record<string, any>,
  secretKey: string
): string => {
  // Sort parameters alphabetically
  const sortedKeys = Object.keys(params).sort();
  
  // Create parameter string
  let paramString = "";
  sortedKeys.forEach(key => {
    if (params[key] !== null && params[key] !== undefined) {
      paramString += `${key}${params[key]}`;
    }
  });
  
  // Generate HMAC-SHA256 signature
  const signature = crypto
    .createHmac("sha256", secretKey)
    .update(paramString)
    .digest("hex");
    
  return signature;
};

export const verify2CheckoutSignature = (
  params: Record<string, any>,
  receivedSignature: string,
  secretKey: string
): boolean => {
  const calculatedSignature = generate2CheckoutSignature(params, secretKey);
  return calculatedSignature === receivedSignature;
};

export interface TwoCheckoutOrderRequest {
  Country: string;
  Currency: string;
  CustomerIP: string;
  ExternalReference?: string;
  Language: string;
  Source: string;
  BillingDetails: {
    Address1: string;
    City: string;
    CountryCode: string;
    Email: string;
    FirstName: string;
    LastName: string;
    Phone?: string;
    State?: string;
    Zip: string;
  };
  Items: Array<{
    Code?: string;
    Name: string;
    Description?: string;
    RecurringOptions?: any;
    IsDynamic: boolean;
    Tangible: boolean;
    PurchaseType: string;
    Price: {
      Amount: number;
      Type: string;
    };
    PriceOptions?: any[];
    Quantity: number;
  }>;
  PaymentDetails: {
    Type: string;
    Currency: string;
    CustomerIP: string;
    PaymentMethod?: any;
  };
}

export interface TwoCheckoutResponse {
  RefNo?: string;
  OrderNo?: string;
  ExternalReference?: string;
  Status?: string;
  ApproveStatus?: string;
  VendorApproveStatus?: string;
  MerchantApproveStatus?: string;
  Errors?: Array<{
    Code: string;
    Message: string;
  }>;
} 