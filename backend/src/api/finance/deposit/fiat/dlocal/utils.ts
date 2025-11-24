import crypto from "crypto";

// dLocal API Configuration
export const getDLocalConfig = () => {
  const xLogin = process.env.APP_DLOCAL_X_LOGIN;
  const xTransKey = process.env.APP_DLOCAL_X_TRANS_KEY;
  const secretKey = process.env.APP_DLOCAL_SECRET_KEY;
  const isProduction = process.env.NODE_ENV === "production";

  if (!xLogin || !xTransKey || !secretKey) {
    throw new Error("dLocal credentials are not properly configured in environment variables");
  }

  return {
    xLogin,
    xTransKey,
    secretKey,
    baseUrl: isProduction 
      ? "https://api.dlocal.com" 
      : "https://sandbox.dlocal.com",
    version: "2.1",
  };
};

// HMAC Signature Generation for API Requests
export const generateSignature = (xLogin: string, xDate: string, requestBody: string, secretKey: string): string => {
  const message = xLogin + xDate + requestBody;
  const signature = crypto.createHmac("sha256", secretKey).update(message, "utf8").digest("hex");
  return `V2-HMAC-SHA256, Signature: ${signature}`;
};

// HMAC Signature Verification for Webhooks
export const verifyWebhookSignature = (
  receivedSignature: string,
  xLogin: string,
  xDate: string,
  requestBody: string,
  secretKey: string
): boolean => {
  try {
    const expectedSignature = generateSignature(xLogin, xDate, requestBody, secretKey);
    return receivedSignature === expectedSignature;
  } catch (error) {
    return false;
  }
};

// HTTP Headers for dLocal API
export const getDLocalHeaders = (xLogin: string, xTransKey: string, xDate: string, signature: string) => ({
  "X-Date": xDate,
  "X-Login": xLogin,
  "X-Trans-Key": xTransKey,
  "Content-Type": "application/json",
  "X-Version": "2.1",
  "User-Agent": "v5-platform/1.0",
  "Authorization": signature,
});

// Currency validation for dLocal supported countries
export const DLOCAL_SUPPORTED_CURRENCIES = [
  // Latin America
  "ARS", "BOB", "BRL", "CLP", "COP", "CRC", "DOP", "USD", "GTQ", "HNL", 
  "MXN", "NIO", "PYG", "PEN", "UYU",
  // Asia
  "BDT", "CNY", "INR", "IDR", "JPY", "MYR", "PKR", "PHP", "THB", "VND",
  // Africa and Middle East
  "XAF", "CDF", "EGP", "GHS", "XOF", "JOD", "KES", "MAD", "NGN", "OMR", 
  "QAR", "RWF", "SAR", "ZAR", "TZS", "TRY", "UGX", "ZMW"
];

export const validateCurrency = (currency: string): boolean => {
  return DLOCAL_SUPPORTED_CURRENCIES.includes(currency.toUpperCase());
};

// Country code mapping for document requirements
export const COUNTRY_DOCUMENT_REQUIREMENTS = {
  AR: { required: true, name: "DNI, CUIT, or CUIL", format: "Between 7 to 9 or 11 digits" },
  BD: { required: true, name: "NID Card", format: "13-17 digits" },
  BO: { required: true, name: "CI", format: "Between 5 to 20 digits" },
  BR: { required: true, name: "CPF or CNPJ", format: "11 digits for CPF, 14 for CNPJ" },
  CM: { required: true, name: "CNI or ID", format: "8 digits" },
  CL: { required: true, name: "CI or RUT", format: "Between 8 to 9 characters" },
  CN: { required: true, name: "Citizen ID", format: "18 digits or 17 digits + letter X" },
  CO: { required: true, name: "CC", format: "Between 6 to 10 digits" },
  CR: { required: true, name: "CI", format: "9 digits" },
  CD: { required: true, name: "National ID Card", format: "12 digits alphanumeric" },
  DO: { required: false, name: "ID", format: "11 digits" },
  EC: { required: true, name: "CI", format: "Between 5 to 20 digits" },
  SV: { required: true, name: "DUI", format: "9 digits" },
  EG: { required: true, name: "ID", format: "14 digits" },
  GH: { required: true, name: "Ghana Card", format: "13 digits (3 letters + 10 numbers)" },
  GT: { required: true, name: "CUI", format: "13 digits" },
  HN: { required: true, name: "DNI", format: "13 digits" },
  IN: { required: true, name: "PAN", format: "10 characters (5 letters, 4 numbers, 1 letter)" },
  ID: { required: true, name: "NIK", format: "16 digits" },
  CI: { required: true, name: "CNI", format: "11 digits" },
  JP: { required: true, name: "My Number", format: "12 digits" },
  JO: { required: true, name: "National ID Card", format: "10 digits" },
  KE: { required: true, name: "National ID Card", format: "8 digits" },
  MY: { required: true, name: "NRIC", format: "12 digits" },
  MX: { required: true, name: "CURP", format: "Between 10 to 18 characters" },
  MA: { required: true, name: "CNIE", format: "Between 5 to 20 characters" },
  NI: { required: true, name: "DNI", format: "14 digits (13 numbers, 1 letter)" },
  NE: { required: true, name: "CNI", format: "7 digits" },
  NG: { required: true, name: "NIN", format: "11 digits" },
  OM: { required: true, name: "National ID Card", format: "9 digits" },
  PK: { required: true, name: "CNIC", format: "13 digits" },
  PA: { required: false, name: "Cedula de Identidad", format: "8 digits" },
  PY: { required: true, name: "CI", format: "Between 5 to 20 digits" },
  PE: { required: true, name: "DNI", format: "Between 8 to 9 digits" },
  PH: { required: true, name: "PSN", format: "12 digits" },
  QA: { required: true, name: "National ID Card", format: "8 digits" },
  RW: { required: true, name: "National Identity Card", format: "16 digits" },
  SA: { required: true, name: "National ID Card", format: "10 digits" },
  SN: { required: true, name: "CNI or ECOWAS ID Card", format: "13 to 17 digits" },
  ZA: { required: true, name: "South African Identity Card", format: "13 digits" },
  TZ: { required: true, name: "National Identity Card", format: "20 digits" },
  TH: { required: true, name: "Thai Identity Card", format: "13 digits" },
  TR: { required: true, name: "T.C. Kimlik No.", format: "Between 5 to 20 digits" },
  UG: { required: true, name: "National ID number", format: "Between 14 to 17 digits" },
  UY: { required: true, name: "CI or RUT", format: "Between 6 to 8 digits or 12 digits" },
  VN: { required: true, name: "VNID", format: "Between 9 or 13 digits" },
  ZM: { required: false, name: "National Registration Card", format: "9 digits" },
};

// TypeScript Interfaces
export interface DLocalPaymentRequest {
  amount: number;
  currency: string;
  country: string;
  payment_method_id: string;
  order_id: string;
  payer: {
    name: string;
    email: string;
    document?: string;
    phone?: string;
    address?: {
      country: string;
      state?: string;
      city?: string;
      zip_code?: string;
      street?: string;
    };
  };
  description?: string;
  notification_url?: string;
  callback_url?: string;
}

export interface DLocalPaymentResponse {
  id: string;
  amount: number;
  currency: string;
  payment_method_id: string;
  payment_method_type: string;
  payment_method_flow: string;
  country: string;
  status: string;
  status_code: number;
  status_detail: string;
  order_id: string;
  created_date: string;
  redirect_url?: string;
  payment_url?: string;
}

export interface DLocalWebhookPayload {
  id: string;
  amount: number;
  currency: string;
  payment_method_id: string;
  payment_method_type: string;
  country: string;
  status: string;
  status_code: number;
  status_detail: string;
  order_id: string;
  created_date: string;
  approved_date?: string;
  live: boolean;
}

export interface DLocalRefundRequest {
  payment_id: string;
  amount?: number;
  currency: string;
  notification_url?: string;
}

export interface DLocalRefundResponse {
  id: string;
  payment_id: string;
  amount: number;
  currency: string;
  status: string;
  status_code: number;
  status_detail: string;
  created_date: string;
}

// Payment status mapping
export const DLOCAL_STATUS_MAPPING = {
  PENDING: "pending",
  PAID: "completed",
  REJECTED: "failed",
  CANCELLED: "cancelled",
  EXPIRED: "expired",
  AUTHORIZED: "authorized",
  REFUNDED: "refunded",
  PARTIALLY_REFUNDED: "partially_refunded",
  CHARGEBACK: "chargeback",
};

// Error handling
export class DLocalError extends Error {
  public code: string;
  public statusCode: number;

  constructor(message: string, code: string = "DLOCAL_ERROR", statusCode: number = 500) {
    super(message);
    this.name = "DLocalError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

// API Request Helper
export const makeDLocalRequest = async (
  endpoint: string,
  method: "GET" | "POST" | "PUT" | "DELETE",
  data?: any
): Promise<any> => {
  const config = getDLocalConfig();
  const xDate = new Date().toISOString();
  const requestBody = data ? JSON.stringify(data) : "";
  const signature = generateSignature(config.xLogin, xDate, requestBody, config.secretKey);
  const headers = getDLocalHeaders(config.xLogin, config.xTransKey, xDate, signature);

  const url = `${config.baseUrl}${endpoint}`;
  
  const requestOptions: RequestInit = {
    method,
    headers,
  };

  if (data && (method === "POST" || method === "PUT")) {
    requestOptions.body = requestBody;
  }

  try {
    const response = await fetch(url, requestOptions);
    const responseData = await response.json();

    if (!response.ok) {
      throw new DLocalError(
        responseData.message || `dLocal API Error: ${response.status}`,
        responseData.code || "API_ERROR",
        response.status
      );
    }

    return responseData;
  } catch (error) {
    if (error instanceof DLocalError) {
      throw error;
    }
    throw new DLocalError(`Network error: ${error.message}`, "NETWORK_ERROR", 500);
  }
}; 