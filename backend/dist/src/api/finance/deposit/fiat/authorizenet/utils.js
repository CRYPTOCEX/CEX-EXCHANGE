"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAuthorizeNetConfig = getAuthorizeNetConfig;
exports.getAuthorizeNetEndpoint = getAuthorizeNetEndpoint;
exports.getAcceptHostedEndpoint = getAcceptHostedEndpoint;
exports.verifyWebhookSignature = verifyWebhookSignature;
exports.makeAuthorizeNetRequest = makeAuthorizeNetRequest;
exports.generateHostedPaymentSettings = generateHostedPaymentSettings;
const crypto = __importStar(require("crypto"));
const console_1 = require("@b/utils/console");
const error_1 = require("@b/utils/error");
function getAuthorizeNetConfig() {
    const apiLoginId = process.env.APP_AUTHORIZENET_API_LOGIN_ID;
    const transactionKey = process.env.APP_AUTHORIZENET_TRANSACTION_KEY;
    const environment = process.env.NODE_ENV === "production" ? "production" : "sandbox";
    const signatureKey = process.env.APP_AUTHORIZENET_SIGNATURE_KEY;
    if (!apiLoginId || !transactionKey) {
        throw (0, error_1.createError)({ statusCode: 500, message: "Authorize.Net API credentials are not set in environment variables" });
    }
    return {
        apiLoginId,
        transactionKey,
        environment,
        signatureKey,
    };
}
function getAuthorizeNetEndpoint(environment) {
    return environment === "production"
        ? "https://api.authorize.net/xml/v1/request.api"
        : "https://apitest.authorize.net/xml/v1/request.api";
}
function getAcceptHostedEndpoint(environment) {
    return environment === "production"
        ? "https://accept.authorize.net/payment/payment"
        : "https://test.authorize.net/payment/payment";
}
function verifyWebhookSignature(payload, signature, signatureKey) {
    if (!signatureKey) {
        console_1.logger.warn("AUTHORIZENET", "Signature key not configured, skipping verification");
        return true;
    }
    const hash = crypto
        .createHmac("sha512", signatureKey)
        .update(payload)
        .digest("hex")
        .toUpperCase();
    const expectedSignature = `sha512=${hash}`;
    return expectedSignature === signature;
}
async function makeAuthorizeNetRequest(request, config) {
    const endpoint = getAuthorizeNetEndpoint(config.environment);
    const response = await fetch(endpoint, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
    });
    if (!response.ok) {
        throw (0, error_1.createError)({ statusCode: 400, message: `Authorize.Net API request failed: ${response.status} ${response.statusText}` });
    }
    const data = await response.json();
    return data;
}
function generateHostedPaymentSettings(options) {
    var _a;
    const settings = [
        {
            settingName: "hostedPaymentReturnOptions",
            settingValue: JSON.stringify({
                showReceipt: (_a = options.showReceipt) !== null && _a !== void 0 ? _a : false,
                url: options.returnUrl,
                urlText: "Continue",
                cancelUrl: options.cancelUrl,
                cancelUrlText: "Cancel",
            }),
        },
        {
            settingName: "hostedPaymentButtonOptions",
            settingValue: JSON.stringify({
                text: "Pay Now",
            }),
        },
        {
            settingName: "hostedPaymentStyleOptions",
            settingValue: JSON.stringify({
                bgColor: "#1f2937",
            }),
        },
        {
            settingName: "hostedPaymentPaymentOptions",
            settingValue: JSON.stringify({
                cardCodeRequired: true,
                showCreditCard: true,
                showBankAccount: false,
            }),
        },
        {
            settingName: "hostedPaymentSecurityOptions",
            settingValue: JSON.stringify({
                captcha: false,
            }),
        },
        {
            settingName: "hostedPaymentBillingAddressOptions",
            settingValue: JSON.stringify({
                show: true,
                required: false,
            }),
        },
        {
            settingName: "hostedPaymentShippingAddressOptions",
            settingValue: JSON.stringify({
                show: false,
                required: false,
            }),
        },
        {
            settingName: "hostedPaymentCustomerOptions",
            settingValue: JSON.stringify({
                showEmail: false,
                requiredEmail: false,
            }),
        },
    ];
    if (options.iframeCommunicatorUrl) {
        settings.push({
            settingName: "hostedPaymentIFrameCommunicatorUrl",
            settingValue: JSON.stringify({
                url: options.iframeCommunicatorUrl,
            }),
        });
    }
    return { setting: settings };
}
