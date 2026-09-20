"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fromStripeAmount = exports.toStripeAmount = exports.useStripe = void 0;
const stripe_1 = __importDefault(require("stripe"));
const error_1 = require("@b/utils/error");
const stripeApiKey = process.env.APP_STRIPE_SECRET_KEY;
const useStripe = () => {
    if (!stripeApiKey) {
        throw (0, error_1.createError)({ statusCode: 503, message: "Stripe API key is not set in environment variables." });
    }
    return new stripe_1.default(stripeApiKey);
};
exports.useStripe = useStripe;
const STRIPE_ZERO_DECIMAL_CURRENCIES = new Set([
    "BIF", "CLP", "DJF", "GNF", "JPY", "KMF", "KRW", "MGA", "PYG", "RWF",
    "UGX", "VND", "VUV", "XAF", "XOF", "XPF",
]);
const STRIPE_THREE_DECIMAL_CURRENCIES = new Set([
    "BHD", "JOD", "KWD", "OMR", "TND",
]);
const stripeUnitFactor = (currency) => {
    const code = (currency || "").toUpperCase();
    if (STRIPE_ZERO_DECIMAL_CURRENCIES.has(code))
        return 1;
    if (STRIPE_THREE_DECIMAL_CURRENCIES.has(code))
        return 1000;
    return 100;
};
const toStripeAmount = (amount, currency) => {
    const factor = stripeUnitFactor(currency);
    const minor = Math.round(Number(amount) * factor);
    return factor === 1000 ? Math.round(minor / 10) * 10 : minor;
};
exports.toStripeAmount = toStripeAmount;
const fromStripeAmount = (minorAmount, currency) => Number(minorAmount) / stripeUnitFactor(currency);
exports.fromStripeAmount = fromStripeAmount;
