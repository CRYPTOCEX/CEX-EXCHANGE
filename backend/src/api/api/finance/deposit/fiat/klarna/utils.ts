import crypto from "crypto";

// Klarna API Configuration
export const getKlarnaConfig = () => {
  const username = process.env.APP_KLARNA_USERNAME;
  const password = process.env.APP_KLARNA_PASSWORD;
  const isProduction = process.env.NODE_ENV === "production";

  if (!username || !password) {
    throw new Error("Klarna credentials are not properly configured in environment variables");
  }

  return {
    username,
    password,
    baseUrl: isProduction 
      ? "https://api.klarna.com" 
      : "https://api.playground.klarna.com",
    version: "1.0", // Current API version
    region: "eu", // Default region
  };
};

// Klarna API Request Function
export const makeKlarnaRequest = async (
  endpoint: string,
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH" = "POST",
  data?: any
) => {
  const config = getKlarnaConfig();
  const url = `${config.baseUrl}${endpoint}`;
  
  // Create Basic Auth header
  const auth = Buffer.from(`${config.username}:${config.password}`).toString('base64');
  
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Authorization": `Basic ${auth}`,
    "User-Agent": "Klarna-API-Client/1.0",
    "Accept": "application/json",
  };

  const requestOptions: RequestInit = {
    method,
    headers,
  };

  if (data && (method === "POST" || method === "PUT" || method === "PATCH")) {
    requestOptions.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(url, requestOptions);
    
    if (!response.ok) {
      const errorData = await response.text();
      let errorMessage = `Klarna API Error: ${response.status}`;
      
      try {
        const parsedError = JSON.parse(errorData);
        errorMessage = parsedError.error_message || parsedError.message || errorMessage;
      } catch {
        // If not JSON, use the raw text
        errorMessage = errorData || errorMessage;
      }
      
      throw new KlarnaError(
        errorMessage,
        response.status,
        { response: errorData }
      );
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    } else {
      return await response.text();
    }
  } catch (error) {
    if (error instanceof KlarnaError) {
      throw error;
    }
    throw new KlarnaError("Network error occurred", 500, { message: error.message });
  }
};

// Klarna Currency Validation
export const validateCurrency = (currency: string): boolean => {
  const supportedCurrencies = [
    "USD", "EUR", "GBP", "SEK", "NOK", "DKK", 
    "AUD", "CAD", "CHF", "CZK", "PLN", "RON", "NZD"
  ];
  return supportedCurrencies.includes(currency.toUpperCase());
};

// Klarna Payment Categories
export const KLARNA_PAYMENT_CATEGORIES = {
  PAY_NOW: "pay_now",
  PAY_LATER: "pay_later", 
  PAY_OVER_TIME: "pay_over_time",
  SLICE_IT: "slice_it"
} as const;

// Klarna Status Mapping
export const KLARNA_STATUS_MAPPING = {
  "AUTHORIZED": "PENDING",
  "PART_CAPTURED": "PENDING", 
  "CAPTURED": "COMPLETED",
  "CANCELLED": "CANCELLED",
  "EXPIRED": "FAILED",
  "CLOSED": "FAILED"
} as const;

// Klarna Order Status
export const KLARNA_ORDER_STATUS = {
  AUTHORIZED: "AUTHORIZED",
  PART_CAPTURED: "PART_CAPTURED",
  CAPTURED: "CAPTURED", 
  CANCELLED: "CANCELLED",
  EXPIRED: "EXPIRED",
  CLOSED: "CLOSED"
} as const;

// Klarna Fraud Status
export const KLARNA_FRAUD_STATUS = {
  ACCEPTED: "ACCEPTED",
  PENDING: "PENDING", 
  REJECTED: "REJECTED"
} as const;

// Klarna Country/Currency Mapping
export const KLARNA_COUNTRY_CURRENCY_MAP: Record<string, string[]> = {
  "US": ["USD"],
  "GB": ["GBP"],
  "DE": ["EUR"],
  "SE": ["SEK"],
  "NO": ["NOK"],
  "DK": ["DKK"],
  "FI": ["EUR"],
  "NL": ["EUR"],
  "AT": ["EUR"],
  "CH": ["CHF"],
  "BE": ["EUR"],
  "FR": ["EUR"],
  "IT": ["EUR"],
  "ES": ["EUR"],
  "PL": ["PLN"],
  "CZ": ["CZK"],
  "AU": ["AUD"],
  "NZ": ["NZD"],
  "CA": ["CAD"],
  "RO": ["RON"]
};

// Klarna Locale Mapping
export const KLARNA_LOCALE_MAP: Record<string, string> = {
  "US": "en-US",
  "GB": "en-GB", 
  "DE": "de-DE",
  "SE": "sv-SE",
  "NO": "nb-NO",
  "DK": "da-DK",
  "FI": "fi-FI",
  "NL": "nl-NL",
  "AT": "de-AT",
  "CH": "de-CH",
  "BE": "nl-BE",
  "FR": "fr-FR",
  "IT": "it-IT",
  "ES": "es-ES",
  "PL": "pl-PL",
  "CZ": "cs-CZ",
  "AU": "en-AU",
  "NZ": "en-NZ",
  "CA": "en-CA",
  "RO": "ro-RO"
};

// Custom Klarna Error Class
export class KlarnaError extends Error {
  public statusCode: number;
  public details: any;

  constructor(message: string, statusCode: number = 500, details: any = {}) {
    super(message);
    this.name = "KlarnaError";
    this.statusCode = statusCode;
    this.details = details;
  }
}

// Webhook Signature Verification for Klarna
export const verifyKlarnaWebhookSignature = (
  payload: string,
  signature: string,
  secret: string
): boolean => {
  try {
    // Extract timestamp and signature from header
    const elements = signature.split(',');
    let timestamp = '';
    let sig = '';
    
    elements.forEach(element => {
      const [key, value] = element.split('=');
      if (key === 'ts') timestamp = value;
      if (key === 'sig') sig = value;
    });

    if (!timestamp || !sig) {
      return false;
    }

    // Create expected signature
    const expectedSignature = crypto
      .createHmac('sha512', secret)
      .update(payload)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(sig, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  } catch (error) {
    return false;
  }
};

// Convert amount to Klarna format (minor units)
export const convertToKlarnaAmount = (amount: number): number => {
  return Math.round(amount * 100);
};

// Convert amount from Klarna format
export const convertFromKlarnaAmount = (amount: number): number => {
  return amount / 100;
};

// Generate unique reference number
export const generateKlarnaReference = (): string => {
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substring(2, 8);
  return `KLR-${timestamp}-${random}`.toUpperCase();
};

// Klarna Payment Session Interface
export interface KlarnaPaymentSession {
  session_id?: string;
  client_token?: string;
  payment_method_categories?: KlarnaPaymentMethodCategory[];
  purchase_country: string;
  purchase_currency: string;
  locale: string;
  order_amount: number;
  order_tax_amount?: number;
  order_lines: KlarnaOrderLine[];
  merchant_urls: KlarnaMerchantUrls;
  billing_address?: KlarnaAddress;
  shipping_address?: KlarnaAddress;
  customer?: KlarnaCustomer;
  merchant_reference1?: string;
  merchant_reference2?: string;
  options?: KlarnaOptions;
}

// Klarna Order Line Interface
export interface KlarnaOrderLine {
  type?: string;
  reference?: string;
  name: string;
  quantity: number;
  quantity_unit?: string;
  unit_price: number;
  tax_rate?: number;
  total_amount: number;
  total_discount_amount?: number;
  total_tax_amount?: number;
  merchant_data?: string;
  product_url?: string;
  image_url?: string;
}

// Klarna Address Interface
export interface KlarnaAddress {
  given_name?: string;
  family_name?: string;
  email?: string;
  title?: string;
  street_address?: string;
  street_address2?: string;
  postal_code?: string;
  city?: string;
  region?: string;
  phone?: string;
  country: string;
}

// Klarna Customer Interface
export interface KlarnaCustomer {
  date_of_birth?: string;
  title?: string;
  gender?: string;
  last_four_ssn?: string;
  national_identification_number?: string;
  type?: string;
  vat_id?: string;
  organization_registration_id?: string;
}

// Klarna Merchant URLs Interface
export interface KlarnaMerchantUrls {
  terms: string;
  checkout?: string;
  confirmation: string;
  push: string;
  authorization?: string;
  notification?: string;
  country_change?: string;
  shipping_option_update?: string;
  address_update?: string;
  order_status_update?: string;
}

// Klarna Payment Method Category Interface
export interface KlarnaPaymentMethodCategory {
  identifier: string;
  name: string;
  asset_urls?: {
    descriptive?: string;
    standard?: string;
  };
}

// Klarna Options Interface
export interface KlarnaOptions {
  acquiring_channel?: string;
  allow_separate_shipping_address?: boolean;
  color_button?: string;
  color_button_text?: string;
  color_checkbox?: string;
  color_checkbox_checkmark?: string;
  color_header?: string;
  color_link?: string;
  date_of_birth_mandatory?: boolean;
  shipping_details?: string;
  title_mandatory?: boolean;
  additional_checkbox?: {
    text: string;
    checked: boolean;
    required: boolean;
  };
  national_identification_number_mandatory?: boolean;
  additional_merchant_terms?: string;
  phone_mandatory?: boolean;
  radius_border?: string;
  allowed_customer_types?: string[];
  show_subtotal_detail?: boolean;
  require_validate_callback_success?: boolean;
  allow_global_billing_countries?: boolean;
  purchase_type?: string;
}

// Klarna Order Interface
export interface KlarnaOrder {
  order_id?: string;
  status?: string;
  fraud_status?: string;
  purchase_country: string;
  purchase_currency: string;
  locale?: string;
  order_amount: number;
  order_tax_amount?: number;
  order_lines: KlarnaOrderLine[];
  customer?: KlarnaCustomer;
  billing_address?: KlarnaAddress;
  shipping_address?: KlarnaAddress;
  merchant_reference1?: string;
  merchant_reference2?: string;
  klarna_reference?: string;
  selected_shipping_option?: any;
  recurring?: boolean;
  recurring_token?: string;
  recurring_description?: string;
  billing_countries?: string[];
  shipping_countries?: string[];
  shipping_options?: any[];
  merchant_data?: string;
  gui?: any;
  merchant_urls?: KlarnaMerchantUrls;
  html_snippet?: string;
  started_at?: string;
  completed_at?: string;
  last_modified_at?: string;
  options?: KlarnaOptions;
  attachment?: any;
  external_payment_methods?: any[];
  external_checkouts?: any[];
  shipping_delay?: number;
  shipping_dispatched?: boolean;
  tags?: string[];
  risk_profile?: string;
}

// Klarna Authorization Interface  
export interface KlarnaAuthorization {
  authorization_token: string;
  authorized_payment_method?: {
    type: string;
    number_of_installments?: number;
    installment_plan?: any[];
  };
  payment_method_info?: {
    type?: string;
    brand?: string;
    masked_number?: string;
    name?: string;
  };
}

// Klarna Capture Interface
export interface KlarnaCapture {
  capture_id?: string;
  klarna_reference?: string;
  captured_amount?: number;
  captured_at?: string;
  description?: string;
  order_lines?: KlarnaOrderLine[];
  shipping_info?: any[];
  billing_address?: KlarnaAddress;
  shipping_address?: KlarnaAddress;
  shipping_delay?: number;
  shipping_dispatched?: boolean;
}

// Klarna Refund Interface
export interface KlarnaRefund {
  refund_id?: string;
  refunded_amount?: number;
  refunded_at?: string;
  description?: string;
  order_lines?: KlarnaOrderLine[];
}

// Klarna Webhook Event Interface
export interface KlarnaWebhookEvent {
  event_id: string;
  event_type: string;
  resource: string;
  occurred_at: string;
  order_id?: string;
  klarna_reference?: string;
}