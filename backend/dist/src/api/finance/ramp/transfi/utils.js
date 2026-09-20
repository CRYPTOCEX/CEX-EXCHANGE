"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRampSettings = getRampSettings;
exports.clearTokenCache = clearTokenCache;
exports.listTokens = listTokens;
exports.looksLikeAddress = looksLikeAddress;
exports.createOnrampOrder = createOnrampOrder;
exports.createOfframpOrder = createOfframpOrder;
exports.getRampOrder = getRampOrder;
exports.assertCustodySupported = assertCustodySupported;
const cache_1 = require("@b/utils/cache");
const error_1 = require("@b/utils/error");
const console_1 = require("@b/utils/console");
const utils_1 = require("@b/api/finance/deposit/fiat/transfi/utils");
async function getRampSettings() {
    let get = (_k) => undefined;
    try {
        const settings = await cache_1.CacheManager.getInstance().getSettings();
        get = (k) => { var _a; return (_a = settings === null || settings === void 0 ? void 0 : settings.get) === null || _a === void 0 ? void 0 : _a.call(settings, k); };
    }
    catch (error) {
        console_1.logger.warn("TRANSFI", `could not read ramp settings: ${error === null || error === void 0 ? void 0 : error.message}`);
    }
    const custody = (k) => (get(k) === "platform" ? "platform" : "self");
    return {
        onrampEnabled: get("transfiOnrampEnabled") === "true",
        offrampEnabled: get("transfiOfframpEnabled") === "true",
        onrampCustody: custody("transfiOnrampCustody"),
        offrampCustody: custody("transfiOfframpCustody"),
    };
}
const TOKEN_CACHE_TTL_MS = Number(process.env.APP_TRANSFI_CONFIG_CACHE_MS) || 10 * 60 * 1000;
const tokenCache = new Map();
function clearTokenCache() {
    tokenCache.clear();
}
async function listTokens(direction = "deposit") {
    const key = `tok:${direction}`;
    const hit = tokenCache.get(key);
    if (hit && Date.now() - hit.at < TOKEN_CACHE_TTL_MS)
        return hit.value;
    try {
        const res = await (0, utils_1.transfiRequest)("/v3/config/list-tokens", {
            query: { direction, userType: "individual" },
        });
        const value = Array.isArray(res === null || res === void 0 ? void 0 : res.data) ? res.data : [];
        tokenCache.set(key, { at: Date.now(), value });
        return value;
    }
    catch (error) {
        if (hit) {
            console_1.logger.warn("TRANSFI", `token refresh failed (${direction}); serving cached list`);
            return hit.value;
        }
        if (error instanceof utils_1.TransfiError && error.statusCode < 500)
            return [];
        throw error;
    }
}
function looksLikeAddress(ticker, address) {
    const a = String(address || "").trim();
    if (!a)
        return false;
    const t = String(ticker || "").toUpperCase();
    if (t.includes("SOL"))
        return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(a);
    if (t.includes("ALGO"))
        return /^[A-Z2-7]{58}$/.test(a);
    if (t.startsWith("LTC"))
        return /^([LM3][a-km-zA-HJ-NP-Z1-9]{26,33}|ltc1[a-z0-9]{20,80})$/.test(a);
    return /^0x[a-fA-F0-9]{40}$/.test(a);
}
async function createOnrampOrder(params) {
    const { purposeCode, purposeCodeReason } = (0, utils_1.getDepositPurposeCode)();
    const res = await (0, utils_1.transfiRequest)("/v3/orders", {
        method: "POST",
        body: {
            userId: params.transfiUserId,
            orderType: "onramp",
            purposeCode,
            ...(purposeCodeReason ? { purposeCodeReason } : {}),
            partnerId: params.partnerId,
            successRedirectUrl: (0, utils_1.transfiReturnUrl)(params.transactionId, "success"),
            failureRedirectUrl: (0, utils_1.transfiReturnUrl)(params.transactionId, "failure"),
            source: {
                currency: params.sourceCurrency.toUpperCase(),
                amount: params.amount,
                paymentCode: params.paymentCode,
                paymentType: params.paymentType,
            },
            destination: {
                currency: params.destinationTicker.toUpperCase(),
                walletAddress: params.walletAddress,
                additionalPaymentDetails: {
                    walletOwner: params.custody === "platform" ? "exchange" : "self",
                    ...(params.custody === "platform" ? {} : { userConfirmed: true }),
                },
            },
        },
    });
    const data = res === null || res === void 0 ? void 0 : res.data;
    if (!(data === null || data === void 0 ? void 0 : data.orderId)) {
        throw new utils_1.TransfiError("TransFi returned no orderId for the onramp", "MALFORMED_ONRAMP_RESPONSE", 502);
    }
    return data;
}
async function createOfframpOrder(params) {
    const { purposeCode, purposeCodeReason } = (0, utils_1.getDepositPurposeCode)();
    const res = await (0, utils_1.transfiRequest)("/v3/orders", {
        method: "POST",
        body: {
            userId: params.transfiUserId,
            orderType: "offramp",
            purposeCode,
            ...(purposeCodeReason ? { purposeCodeReason } : {}),
            partnerId: params.partnerId,
            successRedirectUrl: (0, utils_1.transfiReturnUrl)(params.transactionId, "success"),
            failureRedirectUrl: (0, utils_1.transfiReturnUrl)(params.transactionId, "failure"),
            source: {
                currency: params.sourceTicker.toUpperCase(),
                amount: params.amount,
            },
            destination: {
                currency: params.destinationCurrency.toUpperCase(),
                paymentCode: params.paymentCode,
                paymentType: params.paymentType,
                ...(params.additionalPaymentDetails
                    ? { additionalPaymentDetails: params.additionalPaymentDetails }
                    : {}),
            },
        },
    });
    const data = res === null || res === void 0 ? void 0 : res.data;
    if (!(data === null || data === void 0 ? void 0 : data.orderId)) {
        throw new utils_1.TransfiError("TransFi returned no orderId for the offramp", "MALFORMED_OFFRAMP_RESPONSE", 502);
    }
    if (!data.walletAddress) {
        throw new utils_1.TransfiError("TransFi accepted the offramp but returned no deposit address", "MISSING_DEPOSIT_ADDRESS", 502);
    }
    return data;
}
async function getRampOrder(orderId, orderType) {
    const res = await (0, utils_1.transfiRequest)(`/v3/orders/${encodeURIComponent(orderId)}`);
    const raw = (res === null || res === void 0 ? void 0 : res.data) || {};
    return (0, utils_1.normaliseOrder)({ ...raw, source: { ...(raw.source || {}), currencyType: "crypto" } }, orderType);
}
function assertCustodySupported(direction, custody) {
    if (custody !== "platform")
        return;
    throw (0, error_1.createError)({
        statusCode: 501,
        message: `TransFi ${direction} is set to platform custody, which is not available yet. ` +
            `It requires ${direction === "onramp"
                ? "a platform deposit address per chain and on-chain attribution to credit the right customer"
                : "a funded platform hot wallet and an on-chain send path"}. Switch the custody mode to "self" in Admin -> Settings, or contact your integrator.`,
    });
}
