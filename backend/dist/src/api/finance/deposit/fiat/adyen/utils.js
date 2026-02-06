"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeAdyenApiRequest = exports.verifyHmacSignature = exports.convertFromMinorUnits = exports.convertToMinorUnits = exports.getAdyenHeaders = exports.getAdyenApiUrl = exports.getAdyenConfig = void 0;
const crypto_1 = __importDefault(require("crypto"));
const console_1 = require("@b/utils/console");
const error_1 = require("@b/utils/error");
const getAdyenConfig = () => {
    const apiKey = process.env.APP_ADYEN_API_KEY;
    const merchantAccount = process.env.APP_ADYEN_MERCHANT_ACCOUNT;
    const environment = process.env.APP_ADYEN_ENVIRONMENT || "test";
    const hmacKey = process.env.APP_ADYEN_HMAC_KEY;
    if (!apiKey) {
        throw (0, error_1.createError)({ statusCode: 500, message: "Adyen API key is not set in environment variables" });
    }
    if (!merchantAccount) {
        throw (0, error_1.createError)({ statusCode: 500, message: "Adyen merchant account is not set in environment variables" });
    }
    return {
        apiKey,
        merchantAccount,
        environment,
        hmacKey,
    };
};
exports.getAdyenConfig = getAdyenConfig;
const getAdyenApiUrl = (environment) => {
    return environment === "live"
        ? "https://checkout-live.adyen.com/v71"
        : "https://checkout-test.adyen.com/v71";
};
exports.getAdyenApiUrl = getAdyenApiUrl;
const getAdyenHeaders = (apiKey) => {
    return {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
    };
};
exports.getAdyenHeaders = getAdyenHeaders;
const convertToMinorUnits = (amount, currency) => {
    const zeroDecimalCurrencies = [
        "JPY", "KRW", "VND", "CLP", "PYG", "UGX", "RWF", "VUV", "XAF", "XOF", "XPF",
        "BIF", "CLP", "DJF", "GNF", "ISK", "KMF", "IDR", "CVE"
    ];
    const threeDecimalCurrencies = ["BHD", "IQD", "JOD", "KWD", "LYD", "OMR", "TND"];
    if (zeroDecimalCurrencies.includes(currency)) {
        return Math.round(amount);
    }
    else if (threeDecimalCurrencies.includes(currency)) {
        return Math.round(amount * 1000);
    }
    else {
        return Math.round(amount * 100);
    }
};
exports.convertToMinorUnits = convertToMinorUnits;
const convertFromMinorUnits = (amount, currency) => {
    const zeroDecimalCurrencies = [
        "JPY", "KRW", "VND", "CLP", "PYG", "UGX", "RWF", "VUV", "XAF", "XOF", "XPF",
        "BIF", "CLP", "DJF", "GNF", "ISK", "KMF", "IDR", "CVE"
    ];
    const threeDecimalCurrencies = ["BHD", "IQD", "JOD", "KWD", "LYD", "OMR", "TND"];
    if (zeroDecimalCurrencies.includes(currency)) {
        return amount;
    }
    else if (threeDecimalCurrencies.includes(currency)) {
        return amount / 1000;
    }
    else {
        return amount / 100;
    }
};
exports.convertFromMinorUnits = convertFromMinorUnits;
const verifyHmacSignature = (payload, signature, hmacKey) => {
    try {
        const hmac = crypto_1.default.createHmac("sha256", Buffer.from(hmacKey, "hex"));
        hmac.update(payload, "utf8");
        const computedSignature = hmac.digest("base64");
        return computedSignature === signature;
    }
    catch (error) {
        console_1.logger.error("ADYEN", "Error verifying HMAC signature", error);
        return false;
    }
};
exports.verifyHmacSignature = verifyHmacSignature;
const makeAdyenApiRequest = async (endpoint, data, config) => {
    const baseUrl = (0, exports.getAdyenApiUrl)(config.environment);
    const headers = (0, exports.getAdyenHeaders)(config.apiKey);
    const response = await fetch(`${baseUrl}${endpoint}`, {
        method: "POST",
        headers,
        body: JSON.stringify(data),
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `Adyen API error: ${response.status} - ${errorData.message || response.statusText}`
        });
    }
    return response.json();
};
exports.makeAdyenApiRequest = makeAdyenApiRequest;
