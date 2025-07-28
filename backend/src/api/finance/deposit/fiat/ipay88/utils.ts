import crypto from "crypto";

// iPay88 API Configuration
export const getIpay88Config = () => {
  const merchantCode = process.env.APP_IPAY88_MERCHANT_CODE;
  const merchantKey = process.env.APP_IPAY88_MERCHANT_KEY;
  const isProduction = process.env.NODE_ENV === "production";

  if (!merchantCode || !merchantKey) {
    throw new Error("iPay88 credentials are not properly configured in environment variables");
  }

  return {
    merchantCode,
    merchantKey,
    baseUrl: isProduction 
      ? "https://payment.ipay88.com.my" 
      : "https://sandbox.ipay88.com.my",
    version: "1.6.1", // Current API version
  };
};

// iPay88 API Request Function
export const makeIpay88Request = async (
  endpoint: string,
  method: "GET" | "POST" | "PUT" | "DELETE" = "POST",
  data?: any
) => {
  const config = getIpay88Config();
  const url = `${config.baseUrl}${endpoint}`;
  
  const headers: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded",
    "User-Agent": "iPay88-API-Client/1.0",
  };

  const requestOptions: RequestInit = {
    method,
    headers,
  };

  if (data && (method === "POST" || method === "PUT")) {
    // Convert data to URL-encoded format for iPay88
    const formData = new URLSearchParams();
    Object.keys(data).forEach(key => {
      if (data[key] !== undefined && data[key] !== null) {
        formData.append(key, data[key].toString());
      }
    });
    requestOptions.body = formData.toString();
  }

  try {
    const response = await fetch(url, requestOptions);
    const responseData = await response.text();
    
    if (!response.ok) {
      throw new Ipay88Error(
        `iPay88 API Error: ${response.status}`,
        response.status,
        { response: responseData }
      );
    }

    // iPay88 returns different formats, try to parse as JSON first
    try {
      return JSON.parse(responseData);
    } catch {
      // If not JSON, return as text (common for iPay88 responses)
      return responseData;
    }
  } catch (error) {
    if (error instanceof Ipay88Error) {
      throw error;
    }
    throw new Ipay88Error("Network error occurred", 500, { message: error.message });
  }
};

// iPay88 Currency Validation
export const validateCurrency = (currency: string): boolean => {
  const supportedCurrencies = [
    "MYR", "SGD", "IDR", "VND", "THB", "PHP", 
    "USD", "EUR", "GBP", "AUD"
  ];
  return supportedCurrencies.includes(currency.toUpperCase());
};

// iPay88 Payment Methods
export const IPAY88_PAYMENT_METHODS = {
  // Credit/Debit Cards
  CREDIT_CARD: "2",
  // E-Wallets
  FPXB2B: "6", // FPX B2B
  FPXB2C: "8", // FPX B2C
  ENETS: "10", // eNETS
  SINGPOST: "11", // SingPost
  WEBCASH: "13", // Webcash
  CASH711: "14", // 7-Eleven
  BOOST: "33", // Boost
  GRABPAY: "64", // GrabPay
  MAYBANK_QR: "103", // Maybank QR
  SHOPEE_PAY: "134", // ShopeePay
  TOUCH_N_GO: "149", // Touch 'n Go eWallet
  // Online Banking
  MAYBANK2U: "6", // Maybank2u
  CIMB_CLICKS: "15", // CIMB Clicks
  PUBLIC_BANK: "16", // Public Bank
  RHB_BANK: "17", // RHB Bank
  HONG_LEONG: "18", // Hong Leong Bank
  AMBANK: "20", // AmBank
  // International
  ALIPAY: "23", // Alipay
  WECHAT_PAY: "134", // WeChat Pay
} as const;

// iPay88 Status Mapping
export const IPAY88_STATUS_MAPPING = {
  "1": "COMPLETED", // Success
  "0": "FAILED",    // Failed
  "-1": "PENDING",  // Pending
  "2": "CANCELLED", // Cancelled
} as const;

// iPay88 Response Codes
export const IPAY88_RESPONSE_CODES = {
  "00": "Successful",
  "01": "Refer to card issuer",
  "02": "Refer to card issuer's special condition",
  "03": "Invalid merchant",
  "04": "Pick up card",
  "05": "Do not honor",
  "06": "Error",
  "07": "Pick up card, special condition",
  "08": "Honor with identification",
  "09": "Request in progress",
  "10": "Approved for partial amount",
  "11": "Approved (VIP)",
  "12": "Invalid transaction",
  "13": "Invalid amount",
  "14": "Invalid card number",
  "15": "No such issuer",
  "16": "Approved, update track 3",
  "17": "Customer cancellation",
  "18": "Customer dispute",
  "19": "Re-enter transaction",
  "20": "Invalid response",
  "21": "No action taken",
  "22": "Suspected malfunction",
  "23": "Unacceptable transaction fee",
  "24": "File update not supported by receiver",
  "25": "Unable to locate record on file",
  "26": "Duplicate file update record, old record replaced",
  "27": "File update field edit error",
  "28": "File update file locked out",
  "29": "File update not successful, contact acquirer",
  "30": "Format error",
  "31": "Bank not supported by switch",
  "32": "Completed partially",
  "33": "Expired card",
  "34": "Suspected fraud",
  "35": "Card acceptor contact acquirer",
  "36": "Restricted card",
  "37": "Card acceptor call acquirer security",
  "38": "Allowable PIN tries exceeded",
  "39": "No credit account",
  "40": "Requested function not supported",
  "41": "Lost card",
  "42": "No universal account",
  "43": "Stolen card",
  "44": "No investment account",
  "51": "Not sufficient funds",
  "52": "No checking account",
  "53": "No savings account",
  "54": "Expired card",
  "55": "Incorrect PIN",
  "56": "No card record",
  "57": "Transaction not permitted to cardholder",
  "58": "Transaction not permitted to terminal",
  "59": "Suspected fraud",
  "60": "Card acceptor contact acquirer",
  "61": "Exceeds amount limit",
  "62": "Restricted card",
  "63": "Security violation",
  "64": "Original amount incorrect",
  "65": "Exceeds frequency limit",
  "66": "Card acceptor call acquirer's security department",
  "67": "Hard capture (requires that card be picked up at ATM)",
  "68": "Response received too late",
  "75": "Allowable number of PIN tries exceeded",
  "90": "Cutoff is in process",
  "91": "Issuer unavailable",
  "92": "Financial institution or intermediate network facility cannot be found for routing",
  "93": "Transaction cannot be completed, violation of law",
  "94": "Duplicate transmission",
  "95": "Reconcile error",
  "96": "System malfunction",
  "97": "Reserved for national use",
  "98": "Reserved for national use",
  "99": "Reserved for national use"
} as const;

// iPay88 Error Class
export class Ipay88Error extends Error {
  public statusCode: number;
  public details: any;

  constructor(message: string, statusCode: number = 500, details: any = {}) {
    super(message);
    this.name = "Ipay88Error";
    this.statusCode = statusCode;
    this.details = details;
  }
}

// Generate iPay88 Signature
export const generateIpay88Signature = (
  merchantKey: string,
  merchantCode: string,
  refNo: string,
  amount: string,
  currency: string
): string => {
  // iPay88 signature format: merchantKey + merchantCode + refNo + amount + currency
  const signatureString = `${merchantKey}${merchantCode}${refNo}${amount}${currency}`;
  return crypto.createHash("sha256").update(signatureString).digest("hex");
};

// Verify iPay88 Response Signature
export const verifyIpay88Signature = (
  merchantKey: string,
  merchantCode: string,
  paymentId: string,
  refNo: string,
  amount: string,
  currency: string,
  status: string,
  signature: string
): boolean => {
  // iPay88 response signature format: merchantKey + merchantCode + paymentId + refNo + amount + currency + status
  const signatureString = `${merchantKey}${merchantCode}${paymentId}${refNo}${amount}${currency}${status}`;
  const expectedSignature = crypto.createHash("sha256").update(signatureString).digest("hex");
  return expectedSignature === signature;
};

// Convert amount to iPay88 format (multiply by 100 for cents)
export const convertToIpay88Amount = (amount: number): string => {
  return Math.round(amount * 100).toString();
};

// Convert amount from iPay88 format (divide by 100 from cents)
export const convertFromIpay88Amount = (amount: string): number => {
  return parseInt(amount) / 100;
};

// TypeScript Interfaces
export interface Ipay88PaymentRequest {
  MerchantCode: string;
  PaymentId: string;
  RefNo: string;
  Amount: string;
  Currency: string;
  ProdDesc: string;
  UserName: string;
  UserEmail: string;
  UserContact: string;
  Remark?: string;
  Lang?: string;
  Signature: string;
  ResponseURL: string;
  BackendURL: string;
  PaymentMethod?: string;
  SignatureType?: string;
  TokenId?: string;
}

export interface Ipay88PaymentResponse {
  MerchantCode: string;
  PaymentId: string;
  RefNo: string;
  Amount: string;
  Currency: string;
  Remark: string;
  TransId: string;
  AuthCode: string;
  Status: string;
  ErrDesc: string;
  Signature: string;
  CCName?: string;
  CCNo?: string;
  S_bankname?: string;
  S_country?: string;
}

export interface Ipay88RequeueRequest {
  MerchantCode: string;
  RefNo: string;
  Amount: string;
  Currency: string;
  Signature: string;
}

export interface Ipay88RequeueResponse {
  MerchantCode: string;
  PaymentId: string;
  RefNo: string;
  Amount: string;
  Currency: string;
  Remark: string;
  TransId: string;
  AuthCode: string;
  Status: string;
  ErrDesc: string;
  Signature: string;
}

export interface Ipay88QueryRequest {
  MerchantCode: string;
  RefNo: string;
  Amount: string;
  Currency: string;
  Signature: string;
}

export interface Ipay88QueryResponse {
  MerchantCode: string;
  PaymentId: string;
  RefNo: string;
  Amount: string;
  Currency: string;
  Remark: string;
  TransId: string;
  AuthCode: string;
  Status: string;
  ErrDesc: string;
  Signature: string;
  CCName?: string;
  CCNo?: string;
  S_bankname?: string;
  S_country?: string;
} 