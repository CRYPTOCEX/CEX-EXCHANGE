"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyEwayWebhookSignature = exports.EwayError = exports.EWAY_METHODS = exports.EWAY_TRANSACTION_TYPES = exports.EWAY_STATUS_MAPPING = exports.ewayToMinorUnits = exports.ewayFromMinorUnits = exports.ewayMinorUnitFactor = exports.validateCurrency = exports.makeEwayRequest = exports.getEwayConfig = void 0;
const crypto_1 = __importDefault(require("crypto"));
const error_1 = require("@b/utils/error");
const getEwayConfig = () => {
    const apiKey = process.env.APP_EWAY_API_KEY;
    const apiPassword = process.env.APP_EWAY_API_PASSWORD;
    const isProduction = process.env.NODE_ENV === "production";
    if (!apiKey || !apiPassword) {
        throw (0, error_1.createError)({ statusCode: 500, message: "eWAY credentials are not properly configured in environment variables" });
    }
    return {
        apiKey,
        apiPassword,
        baseUrl: isProduction
            ? "https://api.ewaypayments.com"
            : "https://api.sandbox.ewaypayments.com",
        version: "47",
    };
};
exports.getEwayConfig = getEwayConfig;
const makeEwayRequest = async (endpoint, method = "POST", data) => {
    const config = (0, exports.getEwayConfig)();
    const url = `${config.baseUrl}${endpoint}`;
    const headers = {
        "Content-Type": "application/json",
        "X-EWAY-APIVERSION": config.version,
        "Authorization": `Basic ${Buffer.from(`${config.apiKey}:${config.apiPassword}`).toString('base64')}`,
    };
    const requestOptions = {
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
            throw new EwayError(`eWAY API Error: ${response.status}`, response.status, responseData);
        }
        return responseData;
    }
    catch (error) {
        if (error instanceof EwayError) {
            throw error;
        }
        throw new EwayError("Network error occurred", 500, { message: error.message });
    }
};
exports.makeEwayRequest = makeEwayRequest;
const validateCurrency = (currency) => {
    const supportedCurrencies = [
        "AUD", "NZD", "SGD", "USD", "EUR", "GBP", "CAD", "JPY",
        "HKD", "MYR", "THB", "PHP", "IDR", "VND", "KRW", "CNY",
        "TWD", "INR", "CHF", "SEK", "NOK", "DKK"
    ];
    return supportedCurrencies.includes(currency.toUpperCase());
};
exports.validateCurrency = validateCurrency;
const EWAY_ZERO_DECIMAL_CURRENCIES = [
    "JPY", "KRW", "VND", "IDR", "CLP", "ISK",
];
const ewayMinorUnitFactor = (currency) => EWAY_ZERO_DECIMAL_CURRENCIES.includes(currency.toUpperCase()) ? 1 : 100;
exports.ewayMinorUnitFactor = ewayMinorUnitFactor;
const ewayFromMinorUnits = (minorAmount, currency) => minorAmount / (0, exports.ewayMinorUnitFactor)(currency);
exports.ewayFromMinorUnits = ewayFromMinorUnits;
const ewayToMinorUnits = (majorAmount, currency) => Math.round(majorAmount * (0, exports.ewayMinorUnitFactor)(currency));
exports.ewayToMinorUnits = ewayToMinorUnits;
exports.EWAY_STATUS_MAPPING = {
    true: "COMPLETED",
    false: "FAILED",
};
exports.EWAY_TRANSACTION_TYPES = {
    PURCHASE: "Purchase",
    MOTO: "MOTO",
    RECURRING: "Recurring",
};
exports.EWAY_METHODS = {
    DIRECT: "Direct",
    TRANSPARENT_REDIRECT: "TransparentRedirect",
    RESPONSIVE_SHARED_PAGE: "ResponsiveSharedPage",
    IFRAME: "Iframe",
    SECURE_FIELDS: "SecureFields",
};
class EwayError extends Error {
    constructor(message, statusCode = 500, details = {}) {
        super(message);
        this.name = "EwayError";
        this.statusCode = statusCode;
        this.details = details;
    }
}
exports.EwayError = EwayError;
const verifyEwayWebhookSignature = (receivedSignature, rawBody, secret) => {
    try {
        if (!secret || !receivedSignature)
            return false;
        const expected = crypto_1.default
            .createHmac("sha256", secret)
            .update(rawBody !== null && rawBody !== void 0 ? rawBody : "", "utf8")
            .digest("base64");
        const a = Buffer.from(receivedSignature, "utf8");
        const b = Buffer.from(expected, "utf8");
        if (a.length !== b.length)
            return false;
        return crypto_1.default.timingSafeEqual(a, b);
    }
    catch (_a) {
        return false;
    }
};
exports.verifyEwayWebhookSignature = verifyEwayWebhookSignature;
