"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertFromIpay88Amount = exports.convertToIpay88Amount = exports.verifyIpay88Signature = exports.generateIpay88Signature = exports.Ipay88Error = exports.IPAY88_RESPONSE_CODES = exports.IPAY88_STATUS_MAPPING = exports.IPAY88_PAYMENT_METHODS = exports.validateCurrency = exports.makeIpay88Request = exports.getIpay88Config = void 0;
const crypto_1 = __importDefault(require("crypto"));
const error_1 = require("@b/utils/error");
const getIpay88Config = () => {
    const merchantCode = process.env.APP_IPAY88_MERCHANT_CODE;
    const merchantKey = process.env.APP_IPAY88_MERCHANT_KEY;
    const isProduction = process.env.NODE_ENV === "production";
    if (!merchantCode || !merchantKey) {
        throw (0, error_1.createError)({ statusCode: 500, message: "iPay88 credentials are not properly configured in environment variables" });
    }
    return {
        merchantCode,
        merchantKey,
        baseUrl: isProduction
            ? "https://payment.ipay88.com.my"
            : "https://sandbox.ipay88.com.my",
        version: "1.6.1",
    };
};
exports.getIpay88Config = getIpay88Config;
const makeIpay88Request = async (endpoint, method = "POST", data) => {
    const config = (0, exports.getIpay88Config)();
    const url = `${config.baseUrl}${endpoint}`;
    const headers = {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "iPay88-API-Client/1.0",
    };
    const requestOptions = {
        method,
        headers,
    };
    if (data && (method === "POST" || method === "PUT")) {
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
            throw new Ipay88Error(`iPay88 API Error: ${response.status}`, response.status, { response: responseData });
        }
        try {
            return JSON.parse(responseData);
        }
        catch (_a) {
            return responseData;
        }
    }
    catch (error) {
        if (error instanceof Ipay88Error) {
            throw error;
        }
        throw new Ipay88Error("Network error occurred", 500, { message: error.message });
    }
};
exports.makeIpay88Request = makeIpay88Request;
const validateCurrency = (currency) => {
    const supportedCurrencies = [
        "MYR", "SGD", "IDR", "VND", "THB", "PHP",
        "USD", "EUR", "GBP", "AUD"
    ];
    return supportedCurrencies.includes(currency.toUpperCase());
};
exports.validateCurrency = validateCurrency;
exports.IPAY88_PAYMENT_METHODS = {
    CREDIT_CARD: "2",
    FPXB2B: "6",
    FPXB2C: "8",
    ENETS: "10",
    SINGPOST: "11",
    WEBCASH: "13",
    CASH711: "14",
    BOOST: "33",
    GRABPAY: "64",
    MAYBANK_QR: "103",
    SHOPEE_PAY: "134",
    TOUCH_N_GO: "149",
    MAYBANK2U: "6",
    CIMB_CLICKS: "15",
    PUBLIC_BANK: "16",
    RHB_BANK: "17",
    HONG_LEONG: "18",
    AMBANK: "20",
    ALIPAY: "23",
    WECHAT_PAY: "134",
};
exports.IPAY88_STATUS_MAPPING = {
    "1": "COMPLETED",
    "0": "FAILED",
    "-1": "PENDING",
    "2": "CANCELLED",
};
exports.IPAY88_RESPONSE_CODES = {
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
};
class Ipay88Error extends Error {
    constructor(message, statusCode = 500, details = {}) {
        super(message);
        this.name = "Ipay88Error";
        this.statusCode = statusCode;
        this.details = details;
    }
}
exports.Ipay88Error = Ipay88Error;
const generateIpay88Signature = (merchantKey, merchantCode, refNo, amount, currency) => {
    const signatureString = `${merchantKey}${merchantCode}${refNo}${amount}${currency}`;
    return crypto_1.default.createHash("sha256").update(signatureString).digest("hex");
};
exports.generateIpay88Signature = generateIpay88Signature;
const verifyIpay88Signature = (merchantKey, merchantCode, paymentId, refNo, amount, currency, status, signature) => {
    const signatureString = `${merchantKey}${merchantCode}${paymentId}${refNo}${amount}${currency}${status}`;
    const expectedSignature = crypto_1.default.createHash("sha256").update(signatureString).digest("hex");
    return expectedSignature === signature;
};
exports.verifyIpay88Signature = verifyIpay88Signature;
const convertToIpay88Amount = (amount) => {
    return Math.round(amount * 100).toString();
};
exports.convertToIpay88Amount = convertToIpay88Amount;
const convertFromIpay88Amount = (amount) => {
    return parseInt(amount) / 100;
};
exports.convertFromIpay88Amount = convertFromIpay88Amount;
