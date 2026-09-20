"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NATIVE_SUPPRESSED_REWARDS = exports.NATIVE_FORBIDDEN_CAPABILITIES = exports.NATIVE_FORBIDDEN_PRODUCTS = void 0;
exports.refuseOnNativeApp = refuseOnNativeApp;
exports.refuseCapabilityOnNativeApp = refuseCapabilityOnNativeApp;
exports.isRewardSuppressedOnNativeApp = isRewardSuppressedOnNativeApp;
const error_1 = require("@b/utils/error");
const session_1 = require("@b/utils/session");
exports.NATIVE_FORBIDDEN_PRODUCTS = {
    "ai-investment": {
        label: "AI Investment",
        reason: "AI Investment is not available in the mobile app. It offers a fixed return over a fixed duration funded from a custodial wallet, which app-store rules on financial products do not permit.",
    },
    binary: {
        label: "Binary options",
        reason: "Binary options trading is not available in the mobile app. Google Play prohibits it outright and Apple treats it as gambling.",
    },
    forex: {
        label: "Forex investment plans",
        reason: "Forex investment plans are not available in the mobile app. The plan result is set by an operator rather than by the market, which app-store rules on financial products do not permit.",
    },
    "ico-creator": {
        label: "Token launch (creator side)",
        reason: "Launching a token is not available in the mobile app. The launch fee is charged to a platform wallet, and app-store rules bar a cryptocurrency balance from being used to unlock a feature.",
    },
    mlm: {
        label: "Referral programme",
        reason: "The multi-level referral programme is not available in the mobile app. App-store rules bar a cryptocurrency app from offering currency for recruiting other users.",
    },
};
exports.NATIVE_FORBIDDEN_CAPABILITIES = {
    "strategy-marketplace": {
        label: "Strategy marketplace",
        reason: "Trading strategies cannot be bought or sold in the mobile app. You can still create, configure and run your own bots here.",
    },
    "mint-api-credential": {
        label: "API key creation",
        reason: "API keys are managed on the web. The app can disable or delete a key and stop a running bot, but a new key and its secret are only ever issued in a browser. Sign in on the web to create, rotate or re-scope one.",
    },
};
function refuseOnNativeApp(req, product) {
    if (!(0, session_1.isNativeAppRequest)(req))
        return;
    const entry = exports.NATIVE_FORBIDDEN_PRODUCTS[product];
    throw (0, error_1.createError)({
        statusCode: 403,
        message: entry.reason,
    });
}
function refuseCapabilityOnNativeApp(req, capability) {
    if (!(0, session_1.isNativeAppRequest)(req))
        return;
    const entry = exports.NATIVE_FORBIDDEN_CAPABILITIES[capability];
    throw (0, error_1.createError)({
        statusCode: 403,
        message: entry.reason,
    });
}
exports.NATIVE_SUPPRESSED_REWARDS = new Set([
    "NFT_PURCHASE",
    "NFT_SALE",
    "NFT_TRADE",
    "COPY_TRADING",
    "COPY_TRADING_PROFIT",
]);
function isRewardSuppressedOnNativeApp(req, conditionName) {
    if (!(0, session_1.isNativeAppRequest)(req))
        return false;
    return exports.NATIVE_SUPPRESSED_REWARDS.has(conditionName);
}
