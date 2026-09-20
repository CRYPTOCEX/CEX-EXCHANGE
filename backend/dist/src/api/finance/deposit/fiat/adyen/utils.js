"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeAdyenApiRequest = exports.verifyAdyenNotificationHmac = exports.verifyHmacSignature = exports.convertFromMinorUnits = exports.convertToMinorUnits = exports.getAdyenHeaders = exports.getAdyenApiUrl = exports.getAdyenConfig = void 0;
const crypto_1 = __importDefault(require("crypto"));
const console_1 = require("@b/utils/console");
const error_1 = require("@b/utils/error");
const getAdyenConfig = () => {
    const apiKey = process.env.APP_ADYEN_API_KEY;
    const merchantAccount = process.env.APP_ADYEN_MERCHANT_ACCOUNT;
    const environment = process.env.APP_ADYEN_ENVIRONMENT || "test";
    const hmacKey = process.env.APP_ADYEN_HMAC_KEY;
    const clientKey = process.env.APP_ADYEN_CLIENT_KEY;
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
        clientKey,
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
const verifyAdyenNotificationHmac = (item, hmacKey) => {
    var _a, _b, _c;
    try {
        const sig = (_a = item.additionalData) === null || _a === void 0 ? void 0 : _a.hmacSignature;
        if (!sig)
            return false;
        const escape = (v) => String(v !== null && v !== void 0 ? v : "").replace(/\\/g, "\\\\").replace(/:/g, "\\:");
        const signingString = [
            item.pspReference,
            item.originalReference,
            item.merchantAccountCode,
            item.merchantReference,
            (_b = item.amount) === null || _b === void 0 ? void 0 : _b.value,
            (_c = item.amount) === null || _c === void 0 ? void 0 : _c.currency,
            item.eventCode,
            item.success,
        ].map(escape).join(":");
        const hmac = crypto_1.default.createHmac("sha256", Buffer.from(hmacKey, "hex"));
        hmac.update(signingString, "utf8");
        const computed = hmac.digest("base64");
        const a = Buffer.from(computed, "utf8");
        const b = Buffer.from(sig, "utf8");
        if (a.length !== b.length)
            return false;
        return crypto_1.default.timingSafeEqual(a, b);
    }
    catch (error) {
        console_1.logger.error("ADYEN", "Error verifying Adyen notification HMAC", error);
        return false;
    }
};
exports.verifyAdyenNotificationHmac = verifyAdyenNotificationHmac;
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
