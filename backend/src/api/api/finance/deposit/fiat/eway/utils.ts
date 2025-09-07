import crypto from "crypto";

// eWAY API Configuration
export const getEwayConfig = () => {
  const apiKey = process.env.APP_EWAY_API_KEY;
  const apiPassword = process.env.APP_EWAY_API_PASSWORD;
  const isProduction = process.env.NODE_ENV === "production";

  if (!apiKey || !apiPassword) {
    throw new Error("eWAY credentials are not properly configured in environment variables");
  }

  return {
    apiKey,
    apiPassword,
    baseUrl: isProduction 
      ? "https://api.ewaypayments.com" 
      : "https://api.sandbox.ewaypayments.com",
    version: "47", // Current API version
  };
};

// eWAY API Request Function
export const makeEwayRequest = async (
  endpoint: string,
  method: "GET" | "POST" | "PUT" | "DELETE" = "POST",
  data?: any
) => {
  const config = getEwayConfig();
  const url = `${config.baseUrl}${endpoint}`;
  
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-EWAY-APIVERSION": config.version,
    "Authorization": `Basic ${Buffer.from(`${config.apiKey}:${config.apiPassword}`).toString('base64')}`,
  };

  const requestOptions: RequestInit = {
    method,
    headers,
  };

  if (data && (method === "POST" || method === "PUT")) {
    requestOptions.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(url, requestOptions);
    const responseData = await response.json();
    
    if (!response.ok) {
      throw new EwayError(
        `eWAY API Error: ${response.status}`,
        response.status,
        responseData
      );
    }

    return responseData;
  } catch (error) {
    if (error instanceof EwayError) {
      throw error;
    }
    throw new EwayError("Network error occurred", 500, { message: error.message });
  }
};

// eWAY Currency Validation
export const validateCurrency = (currency: string): boolean => {
  const supportedCurrencies = [
    "AUD", "NZD", "SGD", "USD", "EUR", "GBP", "CAD", "JPY", 
    "HKD", "MYR", "THB", "PHP", "IDR", "VND", "KRW", "CNY", 
    "TWD", "INR", "CHF", "SEK", "NOK", "DKK"
  ];
  return supportedCurrencies.includes(currency.toUpperCase());
};

// eWAY Status Mapping
export const EWAY_STATUS_MAPPING = {
  true: "COMPLETED",
  false: "FAILED",
} as const;

// eWAY Transaction Types
export const EWAY_TRANSACTION_TYPES = {
  PURCHASE: "Purchase",
  MOTO: "MOTO",
  RECURRING: "Recurring",
} as const;

// eWAY Connection Methods
export const EWAY_METHODS = {
  DIRECT: "Direct",
  TRANSPARENT_REDIRECT: "TransparentRedirect", 
  RESPONSIVE_SHARED_PAGE: "ResponsiveSharedPage",
  IFRAME: "Iframe",
  SECURE_FIELDS: "SecureFields",
} as const;

// eWAY Error Class
export class EwayError extends Error {
  public statusCode: number;
  public details: any;

  constructor(message: string, statusCode: number = 500, details: any = {}) {
    super(message);
    this.name = "EwayError";
    this.statusCode = statusCode;
    this.details = details;
  }
}

// TypeScript Interfaces
export interface EwayPaymentRequest {
  Customer: {
    Reference?: string;
    Title?: string;
    FirstName?: string;
    LastName?: string;
    CompanyName?: string;
    JobDescription?: string;
    Street1?: string;
    Street2?: string;
    City?: string;
    State?: string;
    PostalCode?: string;
    Country?: string;
    Email?: string;
    Phone?: string;
    Mobile?: string;
    Comments?: string;
    Fax?: string;
    Url?: string;
    CardDetails?: {
      Name: string;
      Number: string;
      ExpiryMonth: string;
      ExpiryYear: string;
      CVN: string;
      StartMonth?: string;
      StartYear?: string;
      IssueNumber?: string;
    };
    TokenCustomerID?: number;
  };
  Payment: {
    TotalAmount: number;
    InvoiceNumber?: string;
    InvoiceDescription?: string;
    InvoiceReference?: string;
    CurrencyCode?: string;
  };
  Method: string;
  TransactionType: string;
  DeviceID?: string;
  CustomerIP?: string;
  PartnerID?: string;
  RedirectUrl?: string;
  CancelUrl?: string;
  Items?: Array<{
    SKU?: string;
    Description?: string;
    Quantity?: number;
    UnitCost?: number;
    Tax?: number;
    Total?: number;
  }>;
  Options?: Array<{
    Value: string;
  }>;
}

export interface EwayPaymentResponse {
  TransactionID?: number;
  TransactionStatus: boolean;
  TransactionType?: string;
  AuthorisationCode?: string;
  ResponseCode: string;
  ResponseMessage: string;
  Customer?: {
    TokenCustomerID?: number;
    Reference?: string;
    Title?: string;
    FirstName?: string;
    LastName?: string;
    CompanyName?: string;
    JobDescription?: string;
    Street1?: string;
    Street2?: string;
    City?: string;
    State?: string;
    PostalCode?: string;
    Country?: string;
    Email?: string;
    Phone?: string;
    Mobile?: string;
    Comments?: string;
    Fax?: string;
    Url?: string;
    CardDetails?: {
      CardType?: string;
      Number?: string;
      Name?: string;
      ExpiryMonth?: string;
      ExpiryYear?: string;
      StartMonth?: string;
      StartYear?: string;
      IssueNumber?: string;
    };
  };
  Payment?: {
    TotalAmount?: number;
    InvoiceNumber?: string;
    InvoiceDescription?: string;
    InvoiceReference?: string;
    CurrencyCode?: string;
  };
  Errors?: string;
  BeagleScore?: number;
  FormActionURL?: string; // For redirect methods
  AccessCode?: string; // For redirect methods
}

export interface EwayTransparentRedirectRequest {
  Customer: EwayPaymentRequest['Customer'];
  Payment: EwayPaymentRequest['Payment'];
  RedirectUrl: string;
  CancelUrl: string;
  Method: string;
  TransactionType: string;
  DeviceID?: string;
  CustomerIP?: string;
  Items?: EwayPaymentRequest['Items'];
  Options?: EwayPaymentRequest['Options'];
}

export interface EwayTransparentRedirectResponse {
  FormActionURL: string;
  AccessCode: string;
  Customer?: EwayPaymentResponse['Customer'];
  Payment?: EwayPaymentResponse['Payment'];
  Errors?: string;
}

export interface EwayTransactionQueryResponse {
  TransactionID: number;
  TransactionStatus: boolean;
  TransactionType: string;
  AuthorisationCode?: string;
  ResponseCode: string;
  ResponseMessage: string;
  TransactionDateTime?: string;
  Customer?: EwayPaymentResponse['Customer'];
  Payment?: EwayPaymentResponse['Payment'];
  BeagleScore?: number;
  MaxRefund?: number;
  OriginalTransactionId?: number;
  Source?: string;
  Errors?: string;
} 