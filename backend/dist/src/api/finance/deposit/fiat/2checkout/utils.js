"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verify2CheckoutSignature = exports.generate2CheckoutSignature = exports.get2CheckoutApiUrl = exports.use2Checkout = void 0;
const crypto_1 = __importDefault(require("crypto"));
const error_1 = require("@b/utils/error");
const TWOCHECKOUT_MERCHANT_CODE = process.env.APP_2CHECKOUT_MERCHANT_CODE;
const TWOCHECKOUT_SECRET_KEY = process.env.APP_2CHECKOUT_SECRET_KEY;
const TWOCHECKOUT_ACCOUNT_REFERENCE = process.env.APP_2CHECKOUT_ACCOUNT_REFERENCE;
const use2Checkout = () => {
    if (!TWOCHECKOUT_MERCHANT_CODE || !TWOCHECKOUT_SECRET_KEY) {
        throw (0, error_1.createError)({ statusCode: 500, message: "2Checkout credentials are not set in environment variables." });
    }
    return {
        merchantCode: TWOCHECKOUT_MERCHANT_CODE,
        secretKey: TWOCHECKOUT_SECRET_KEY,
        accountReference: TWOCHECKOUT_ACCOUNT_REFERENCE || "",
        isProduction: process.env.NODE_ENV === "production",
    };
};
exports.use2Checkout = use2Checkout;
const get2CheckoutApiUrl = (isProduction) => {
    return isProduction
        ? "https://api.2checkout.com"
        : "https://api.2checkout.com";
};
exports.get2CheckoutApiUrl = get2CheckoutApiUrl;
const generate2CheckoutSignature = (params, secretKey) => {
    const sortedKeys = Object.keys(params).sort();
    let paramString = "";
    sortedKeys.forEach(key => {
        if (params[key] !== null && params[key] !== undefined) {
            paramString += `${key}${params[key]}`;
        }
    });
    const signature = crypto_1.default
        .createHmac("sha256", secretKey)
        .update(paramString)
        .digest("hex");
    return signature;
};
exports.generate2CheckoutSignature = generate2CheckoutSignature;
const verify2CheckoutSignature = (params, receivedSignature, secretKey) => {
    const calculatedSignature = (0, exports.generate2CheckoutSignature)(params, secretKey);
    return calculatedSignature === receivedSignature;
};
exports.verify2CheckoutSignature = verify2CheckoutSignature;
