"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.useStripe = void 0;
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
