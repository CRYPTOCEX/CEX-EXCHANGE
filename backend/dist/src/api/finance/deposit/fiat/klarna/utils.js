"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateKlarnaReference = exports.convertFromKlarnaAmount = exports.convertToKlarnaAmount = exports.verifyKlarnaWebhookSignature = exports.KlarnaError = exports.KLARNA_LOCALE_MAP = exports.KLARNA_COUNTRY_CURRENCY_MAP = exports.KLARNA_FRAUD_STATUS = exports.KLARNA_ORDER_STATUS = exports.KLARNA_STATUS_MAPPING = exports.KLARNA_PAYMENT_CATEGORIES = exports.validateCurrency = exports.makeKlarnaRequest = exports.getKlarnaConfig = void 0;
const crypto_1 = __importDefault(require("crypto"));
const error_1 = require("@b/utils/error");
const getKlarnaConfig = () => {
    const username = process.env.APP_KLARNA_USERNAME;
    const password = process.env.APP_KLARNA_PASSWORD;
    const isProduction = process.env.NODE_ENV === "production";
    if (!username || !password) {
        throw (0, error_1.createError)({ statusCode: 503, message: "Klarna credentials are not properly configured in environment variables" });
    }
    return {
        username,
        password,
        baseUrl: isProduction
            ? "https://api.klarna.com"
            : "https://api.playground.klarna.com",
        version: "1.0",
        region: "eu",
    };
};
exports.getKlarnaConfig = getKlarnaConfig;
const makeKlarnaRequest = async (endpoint, method = "POST", data) => {
    const config = (0, exports.getKlarnaConfig)();
    const url = `${config.baseUrl}${endpoint}`;
    const auth = Buffer.from(`${config.username}:${config.password}`).toString('base64');
    const headers = {
        "Content-Type": "application/json",
        "Authorization": `Basic ${auth}`,
        "User-Agent": "Klarna-API-Client/1.0",
        "Accept": "application/json",
    };
    const requestOptions = {
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
            }
            catch (_a) {
                errorMessage = errorData || errorMessage;
            }
            throw new KlarnaError(errorMessage, response.status, { response: errorData });
        }
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            return await response.json();
        }
        else {
            return await response.text();
        }
    }
    catch (error) {
        if (error instanceof KlarnaError) {
            throw error;
        }
        throw new KlarnaError("Network error occurred", 500, { message: error.message });
    }
};
exports.makeKlarnaRequest = makeKlarnaRequest;
const validateCurrency = (currency) => {
    const supportedCurrencies = [
        "USD", "EUR", "GBP", "SEK", "NOK", "DKK",
        "AUD", "CAD", "CHF", "CZK", "PLN", "RON", "NZD"
    ];
    return supportedCurrencies.includes(currency.toUpperCase());
};
exports.validateCurrency = validateCurrency;
exports.KLARNA_PAYMENT_CATEGORIES = {
    PAY_NOW: "pay_now",
    PAY_LATER: "pay_later",
    PAY_OVER_TIME: "pay_over_time",
    SLICE_IT: "slice_it"
};
exports.KLARNA_STATUS_MAPPING = {
    "AUTHORIZED": "PENDING",
    "PART_CAPTURED": "PENDING",
    "CAPTURED": "COMPLETED",
    "CANCELLED": "CANCELLED",
    "EXPIRED": "FAILED",
    "CLOSED": "FAILED"
};
exports.KLARNA_ORDER_STATUS = {
    AUTHORIZED: "AUTHORIZED",
    PART_CAPTURED: "PART_CAPTURED",
    CAPTURED: "CAPTURED",
    CANCELLED: "CANCELLED",
    EXPIRED: "EXPIRED",
    CLOSED: "CLOSED"
};
exports.KLARNA_FRAUD_STATUS = {
    ACCEPTED: "ACCEPTED",
    PENDING: "PENDING",
    REJECTED: "REJECTED"
};
exports.KLARNA_COUNTRY_CURRENCY_MAP = {
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
exports.KLARNA_LOCALE_MAP = {
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
class KlarnaError extends Error {
    constructor(message, statusCode = 500, details = {}) {
        super(message);
        this.name = "KlarnaError";
        this.statusCode = statusCode;
        this.details = details;
    }
}
exports.KlarnaError = KlarnaError;
const verifyKlarnaWebhookSignature = (payload, signature, secret) => {
    try {
        const elements = signature.split(',');
        let timestamp = '';
        let sig = '';
        elements.forEach(element => {
            const [key, value] = element.split('=');
            if (key === 'ts')
                timestamp = value;
            if (key === 'sig')
                sig = value;
        });
        if (!timestamp || !sig) {
            return false;
        }
        const expectedSignature = crypto_1.default
            .createHmac('sha512', secret)
            .update(payload)
            .digest('hex');
        return crypto_1.default.timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expectedSignature, 'hex'));
    }
    catch (error) {
        return false;
    }
};
exports.verifyKlarnaWebhookSignature = verifyKlarnaWebhookSignature;
const convertToKlarnaAmount = (amount) => {
    return Math.round(amount * 100);
};
exports.convertToKlarnaAmount = convertToKlarnaAmount;
const convertFromKlarnaAmount = (amount) => {
    return amount / 100;
};
exports.convertFromKlarnaAmount = convertFromKlarnaAmount;
const generateKlarnaReference = () => {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2, 8);
    return `KLR-${timestamp}-${random}`.toUpperCase();
};
exports.generateKlarnaReference = generateKlarnaReference;
