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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.KYC_REQUIRED_CODES = exports.SIGNATURE_VARIANT_OBSERVED_KEY = exports.TRANSFI_SIGNATURE_HEADER = exports.TRANSFI_PURPOSE_CODES = exports.TransfiError = exports.TRANSFI_PRODUCTION_BASE_URL = exports.TRANSFI_SANDBOX_BASE_URL = void 0;
exports.getTransfiConfig = getTransfiConfig;
exports.assertTransfiConfig = assertTransfiConfig;
exports.assertTransfiWebhookSecret = assertTransfiWebhookSecret;
exports.parseGatewayCurrencies = parseGatewayCurrencies;
exports.transfiRequest = transfiRequest;
exports.mapTransfiStatus = mapTransfiStatus;
exports.isComplianceHold = isComplianceHold;
exports.isTerminal = isTerminal;
exports.getDepositPurposeCode = getDepositPurposeCode;
exports.verifyTransfiWebhookSignature = verifyTransfiWebhookSignature;
exports.signTransfiPayload = signTransfiPayload;
exports.recordObservedSignatureVariant = recordObservedSignatureVariant;
exports.clearTransfiConfigCache = clearTransfiConfigCache;
exports.listSupportedCurrencies = listSupportedCurrencies;
exports.listPaymentMethods = listPaymentMethods;
exports.getQuote = getQuote;
exports.extractLimitsFromError = extractLimitsFromError;
exports.resolveCorridorLimits = resolveCorridorLimits;
exports.intersectLimits = intersectLimits;
exports.createPayinOrder = createPayinOrder;
exports.normaliseOrder = normaliseOrder;
exports.getOrder = getOrder;
exports.createIndividualUser = createIndividualUser;
exports.findUserByEmail = findUserByEmail;
exports.isUserUsable = isUserUsable;
exports.isUserRejected = isUserRejected;
exports.initiateStandardKyc = initiateStandardKyc;
exports.isKycRequiredError = isKycRequiredError;
exports.transfiWebhookUrl = transfiWebhookUrl;
exports.transfiReturnUrl = transfiReturnUrl;
exports.transfiKycReturnUrl = transfiKycReturnUrl;
const crypto_1 = __importDefault(require("crypto"));
const error_1 = require("@b/utils/error");
const console_1 = require("@b/utils/console");
exports.TRANSFI_SANDBOX_BASE_URL = "https://sandbox-api.transfi.com";
exports.TRANSFI_PRODUCTION_BASE_URL = "https://api.transfi.com";
function getTransfiConfig() {
    const username = process.env.APP_TRANSFI_USERNAME || "";
    const password = process.env.APP_TRANSFI_PASSWORD || "";
    const mid = process.env.APP_TRANSFI_MID || "";
    const webhookSecret = process.env.APP_TRANSFI_WEBHOOK_SECRET || "";
    const explicitBase = (process.env.APP_TRANSFI_BASE_URL || "").trim().replace(/\/+$/, "");
    const sandbox = explicitBase
        ? !explicitBase.includes("//api.transfi.com")
        : process.env.APP_TRANSFI_SANDBOX !== "false";
    return {
        username,
        password,
        mid,
        webhookSecret,
        baseUrl: explicitBase || (sandbox ? exports.TRANSFI_SANDBOX_BASE_URL : exports.TRANSFI_PRODUCTION_BASE_URL),
        sandbox,
        timeoutMs: Number(process.env.APP_TRANSFI_TIMEOUT_MS) || 30000,
    };
}
function assertTransfiConfig(config = getTransfiConfig()) {
    const missing = [];
    if (!config.username)
        missing.push("APP_TRANSFI_USERNAME");
    if (!config.password)
        missing.push("APP_TRANSFI_PASSWORD");
    if (!config.mid)
        missing.push("APP_TRANSFI_MID");
    if (missing.length) {
        throw (0, error_1.createError)({
            statusCode: 500,
            message: `TransFi is enabled but not configured. Missing: ${missing.join(", ")}`,
        });
    }
    return config;
}
function assertTransfiWebhookSecret(config = getTransfiConfig()) {
    if (!config.webhookSecret) {
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "TransFi webhook secret is not configured (APP_TRANSFI_WEBHOOK_SECRET)",
        });
    }
    return config.webhookSecret;
}
function parseGatewayCurrencies(value) {
    if (Array.isArray(value))
        return value.map((c) => String(c).toUpperCase());
    if (typeof value === "string" && value.trim()) {
        try {
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed))
                return parsed.map((c) => String(c).toUpperCase());
        }
        catch (_a) {
            return value
                .split(",")
                .map((c) => c.trim().toUpperCase())
                .filter(Boolean);
        }
    }
    return [];
}
class TransfiError extends Error {
    constructor(message, code = "TRANSFI_ERROR", statusCode = 500, extra = {}) {
        super(message);
        this.name = "TransfiError";
        this.code = code;
        this.statusCode = statusCode;
        this.details = extra.details || [];
        this.traceId = extra.traceId;
        this.errorId = extra.errorId;
    }
}
exports.TransfiError = TransfiError;
function toTransfiError(httpStatus, body, fallbackMessage) {
    var _a;
    const err = body === null || body === void 0 ? void 0 : body.error;
    const nested = typeof err === "object" && err !== null ? err : null;
    const message = (nested === null || nested === void 0 ? void 0 : nested.message) ||
        (typeof err === "string" ? err : undefined) ||
        (body === null || body === void 0 ? void 0 : body.message) ||
        fallbackMessage;
    const code = (nested === null || nested === void 0 ? void 0 : nested.code) || (body === null || body === void 0 ? void 0 : body.code) || `HTTP_${httpStatus}`;
    const details = ((_a = nested === null || nested === void 0 ? void 0 : nested.context) === null || _a === void 0 ? void 0 : _a.details) || (nested === null || nested === void 0 ? void 0 : nested.details) || [];
    return new TransfiError(message, code, httpStatus, {
        details: Array.isArray(details) ? details : [],
        traceId: body === null || body === void 0 ? void 0 : body.traceId,
        errorId: body === null || body === void 0 ? void 0 : body.errorId,
    });
}
function authHeader(config) {
    return `Basic ${Buffer.from(`${config.username}:${config.password}`, "utf8").toString("base64")}`;
}
async function transfiRequest(path, options = {}) {
    const config = assertTransfiConfig(options.config || getTransfiConfig());
    const method = options.method || "GET";
    let url = `${config.baseUrl}${path}`;
    if (options.query) {
        const qs = new URLSearchParams();
        for (const [k, v] of Object.entries(options.query)) {
            if (v !== undefined && v !== null && v !== "")
                qs.append(k, String(v));
        }
        const s = qs.toString();
        if (s)
            url += (url.includes("?") ? "&" : "?") + s;
    }
    const headers = {
        Authorization: authHeader(config),
        Accept: "application/json",
    };
    if (!options.omitMid)
        headers.MID = config.mid;
    if (options.body !== undefined)
        headers["Content-Type"] = "application/json";
    let response;
    try {
        response = await fetch(url, {
            method,
            headers,
            body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
            signal: AbortSignal.timeout(config.timeoutMs),
        });
    }
    catch (error) {
        if ((error === null || error === void 0 ? void 0 : error.name) === "TimeoutError" || (error === null || error === void 0 ? void 0 : error.name) === "AbortError") {
            throw new TransfiError(`TransFi request timed out after ${config.timeoutMs}ms (${method} ${path})`, "TIMEOUT", 504);
        }
        throw new TransfiError(`TransFi network error (${method} ${path}): ${(error === null || error === void 0 ? void 0 : error.message) || error}`, "NETWORK_ERROR", 502);
    }
    const traceId = response.headers.get("x-trace-id") || undefined;
    const text = await response.text();
    let body = undefined;
    if (text) {
        try {
            body = JSON.parse(text);
        }
        catch (_a) {
            throw new TransfiError(`TransFi returned a non-JSON response (${response.status} ${method} ${path})`, "NON_JSON_RESPONSE", response.status >= 400 ? response.status : 502, { traceId });
        }
    }
    const failed = !response.ok || (body === null || body === void 0 ? void 0 : body.status) === "failure" || (body === null || body === void 0 ? void 0 : body.error) !== undefined;
    if (failed) {
        const err = toTransfiError(response.status, body, `TransFi request failed (${method} ${path})`);
        if (!err.traceId)
            err.traceId = traceId;
        console_1.logger.error("TRANSFI", `[transfi] ${method} ${path} -> ${response.status} ${err.code}: ${err.message}` +
            ` traceId=${err.traceId || "-"} errorId=${err.errorId || "-"}` +
            (err.details.length ? ` details=${JSON.stringify(err.details)}` : ""));
        throw err;
    }
    console_1.logger.debug("TRANSFI", `${method} ${path} -> ${response.status} traceId=${traceId || "-"}`);
    return body;
}
const STATUS_MAP = {
    "payin:fiat": {
        initiated: "PENDING",
        fund_processing: "PENDING",
        manual_review: "PENDING",
        fund_settled: "COMPLETED",
        fund_failed: "FAILED",
    },
    "payin:crypto": {
        initiated: "PENDING",
        asset_settled: "COMPLETED",
    },
    "payout:fiat": {
        initiated: "PENDING",
        fund_processing: "PENDING",
        fund_scheduled: "PENDING",
        fund_settled: "COMPLETED",
        fund_failed: "FAILED",
    },
    "payout:crypto": {
        initiated: "PENDING",
        asset_deposited: "COMPLETED",
        fund_deposit_failed: "FAILED",
    },
};
function mapTransfiStatus(orderType, status, rail = "fiat") {
    const table = STATUS_MAP[`${orderType}:${rail}`];
    const mapped = table === null || table === void 0 ? void 0 : table[String(status || "").toLowerCase()];
    return mapped || "PENDING";
}
function isComplianceHold(status) {
    return String(status || "").toLowerCase() === "manual_review";
}
function isTerminal(mapped) {
    return mapped === "COMPLETED" || mapped === "FAILED" || mapped === "CANCELLED";
}
exports.TRANSFI_PURPOSE_CODES = [
    "insurance_claims", "maintenance_expenses", "low_value_remittance", "travel_expenses",
    "gift_and_donation", "office_expenses", "export_payments", "friends_and_family_transfer",
    "liberalized_remittance", "government_tax_payment", "healthcare_expenses", "shares_investment",
    "royalty_fees", "business_insurance", "advertising_expenses", "shipping_costs",
    "property_purchase", "household_support", "utility_bills", "construction_expenses",
    "property_rental", "service_charges", "hotel_accommodation", "salary_payment",
    "education", "advisory_fees", "fund_investment", "company_expenses",
    "general_bills", "insurance", "investment", "remittance",
    "medical_expenses", "taxes", "vendor_payment", "training_fees",
    "business_operation_expenses", "debt_repayment", "gaming_top_ups", "gaming_withdrawals",
    "gaming_fees", "arbitrage_trading", "arbitrage_settlement", "currency_swaps",
    "customer_currency_exchange", "liquidity_management", "treasury_reconciliation", "market_making",
    "expense_or_medical_reimbursement", "fee_payments", "payroll_processing",
    "transaction_between_banks", "services_related_to_financial_trade_travel_or_accounting",
    "transportation_costs", "software_export_or_development", "personal", "prefund", "other",
];
function getDepositPurposeCode() {
    const configured = (process.env.APP_TRANSFI_PURPOSE_CODE || "").trim();
    const purposeCode = configured && exports.TRANSFI_PURPOSE_CODES.includes(configured)
        ? configured
        : "personal";
    if (purposeCode === "other") {
        return {
            purposeCode,
            purposeCodeReason: process.env.APP_TRANSFI_PURPOSE_REASON || "Customer wallet top-up on trading platform",
        };
    }
    return { purposeCode };
}
exports.TRANSFI_SIGNATURE_HEADER = "x-transfi-hmac-hash";
function hmacHex(secret, message) {
    return crypto_1.default.createHmac("sha256", Buffer.from(secret, "utf8")).update(message, "utf8").digest("hex");
}
function constantTimeEquals(a, b) {
    const ab = Buffer.from(a, "utf8");
    const bb = Buffer.from(b, "utf8");
    if (ab.length !== bb.length)
        return false;
    return crypto_1.default.timingSafeEqual(ab, bb);
}
function pythonJsonDumps(value) {
    const enc = (v) => {
        if (v === null)
            return "null";
        if (typeof v === "boolean")
            return v ? "true" : "false";
        if (typeof v === "number")
            return Number.isInteger(v) ? String(v) : String(v);
        if (typeof v === "string")
            return escapeAscii(JSON.stringify(v));
        if (Array.isArray(v))
            return `[${v.map(enc).join(", ")}]`;
        if (typeof v === "object") {
            return `{${Object.keys(v)
                .map((k) => `${escapeAscii(JSON.stringify(k))}: ${enc(v[k])}`)
                .join(", ")}}`;
        }
        return "null";
    };
    const escapeAscii = (s) => s.replace(/[-￿]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, "0")}`);
    return enc(value);
}
function verifyTransfiWebhookSignature(rawBody, receivedSignature, parsedBody, secret) {
    const key = secret || getTransfiConfig().webhookSecret;
    if (!key)
        return { valid: false, reason: "webhook secret not configured" };
    if (!receivedSignature)
        return { valid: false, reason: "missing signature header" };
    const received = receivedSignature.trim().toLowerCase();
    const pin = (process.env.APP_TRANSFI_SIGNATURE_VARIANT || "").trim().toLowerCase();
    if (pin !== "python" && constantTimeEquals(hmacHex(key, rawBody), received)) {
        return { valid: true, variant: "raw" };
    }
    if (pin !== "raw" && parsedBody !== undefined) {
        if (constantTimeEquals(hmacHex(key, pythonJsonDumps(parsedBody)), received)) {
            return { valid: true, variant: "python-json-dumps" };
        }
    }
    return { valid: false, reason: "signature mismatch" };
}
function signTransfiPayload(rawBody, secret) {
    return hmacHex(secret || getTransfiConfig().webhookSecret, rawBody);
}
exports.SIGNATURE_VARIANT_OBSERVED_KEY = "transfiSignatureVariantObserved";
async function recordObservedSignatureVariant(variant) {
    try {
        const { models } = await Promise.resolve().then(() => __importStar(require("@b/db")));
        const [row] = await models.settings.findOrCreate({
            where: { key: exports.SIGNATURE_VARIANT_OBSERVED_KEY },
            defaults: { key: exports.SIGNATURE_VARIANT_OBSERVED_KEY, value: variant },
        });
        if (row.value !== variant) {
            if (row.value) {
                console_1.logger.error("TRANSFI", `webhook signature canonicalization CHANGED: was "${row.value}", now "${variant}". ` +
                    `Re-check APP_TRANSFI_SIGNATURE_VARIANT.`);
            }
            await row.update({ value: variant });
        }
    }
    catch (_a) {
    }
}
const CACHE_TTL_MS = Number(process.env.APP_TRANSFI_CONFIG_CACHE_MS) || 10 * 60 * 1000;
const cache = new Map();
async function cached(key, load) {
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < CACHE_TTL_MS)
        return hit.value;
    const value = await load();
    cache.set(key, { at: Date.now(), value });
    return value;
}
function clearTransfiConfigCache() {
    cache.clear();
}
async function listSupportedCurrencies(direction = "deposit", userType = "individual") {
    return cached(`cur:${direction}:${userType}`, async () => {
        const res = await transfiRequest("/v3/config/supported-currencies", { query: { direction, userType, limit: 200 } });
        return Array.isArray(res === null || res === void 0 ? void 0 : res.data) ? res.data : [];
    });
}
async function listPaymentMethods(currency, direction = "deposit", userType = "individual") {
    const cur = currency.toUpperCase();
    return cached(`pm:${direction}:${cur}:${userType}`, async () => {
        try {
            const res = await transfiRequest("/v3/config/payment-methods", { query: { direction, currency: cur, userType } });
            return Array.isArray(res === null || res === void 0 ? void 0 : res.data) ? res.data : [];
        }
        catch (error) {
            if (error instanceof TransfiError && error.statusCode < 500)
                return [];
            throw error;
        }
    });
}
async function getQuote(params) {
    return transfiRequest("/v3/exchange-rates", {
        query: {
            sourceCurrency: params.sourceCurrency.toUpperCase(),
            destinationCurrency: params.destinationCurrency.toUpperCase(),
            amount: params.amount,
            orderType: params.orderType || "payin",
            direction: "forward",
            paymentCode: params.paymentCode,
            paymentType: params.paymentType,
        },
    });
}
function extractLimitsFromError(error) {
    if (!(error instanceof TransfiError))
        return null;
    for (const d of error.details) {
        const min = typeof (d === null || d === void 0 ? void 0 : d.minLimit) === "number" ? d.minLimit : undefined;
        const max = typeof (d === null || d === void 0 ? void 0 : d.maxLimit) === "number" ? d.maxLimit : undefined;
        if (min !== undefined || max !== undefined)
            return { minLimit: min, maxLimit: max };
    }
    return null;
}
async function resolveCorridorLimits(currency, method, amount) {
    const probe = Number.isFinite(amount) && amount > 0 ? amount : 1;
    try {
        const quote = await getQuote({
            sourceCurrency: currency,
            destinationCurrency: currency,
            amount: probe,
            orderType: "payin",
            paymentCode: method.paymentCode,
            paymentType: method.paymentType,
        });
        return { ...intersectLimits(quote, method), quote };
    }
    catch (error) {
        const recovered = extractLimitsFromError(error);
        return { ...intersectLimits(recovered, method), quote: null };
    }
}
function intersectLimits(quote, method) {
    const mins = [quote === null || quote === void 0 ? void 0 : quote.minLimit, method === null || method === void 0 ? void 0 : method.minAmount].filter((n) => typeof n === "number" && Number.isFinite(n) && n > 0);
    const maxes = [quote === null || quote === void 0 ? void 0 : quote.maxLimit, method === null || method === void 0 ? void 0 : method.maxAmount].filter((n) => typeof n === "number" && Number.isFinite(n) && n > 0);
    return {
        min: mins.length ? Math.max(...mins) : 0,
        max: maxes.length ? Math.min(...maxes) : null,
    };
}
async function createPayinOrder(params) {
    const { purposeCode, purposeCodeReason } = getDepositPurposeCode();
    const body = {
        userId: params.transfiUserId,
        orderType: "payin",
        purposeCode,
        ...(purposeCodeReason ? { purposeCodeReason } : {}),
        partnerId: params.partnerId,
        successRedirectUrl: params.successRedirectUrl,
        failureRedirectUrl: params.failureRedirectUrl,
        ...(params.sourceUrl ? { sourceUrl: params.sourceUrl } : {}),
        source: {
            currency: params.sourceCurrency.toUpperCase(),
            amount: params.amount,
            ...(params.paymentCode ? { paymentCode: params.paymentCode } : {}),
            ...(params.paymentType ? { paymentType: params.paymentType } : {}),
        },
        destination: {
            currency: (params.destinationCurrency || params.sourceCurrency).toUpperCase(),
        },
        ...(params.customerMetaData ? { customerMetaData: params.customerMetaData } : {}),
        ...(params.locale ? { customization: { locale: params.locale } } : {}),
    };
    const res = await transfiRequest("/v3/orders", {
        method: "POST",
        body,
    });
    const data = res === null || res === void 0 ? void 0 : res.data;
    if (!(data === null || data === void 0 ? void 0 : data.orderId)) {
        throw new TransfiError("TransFi accepted the order but returned no orderId", "MALFORMED_ORDER_RESPONSE", 502);
    }
    return data;
}
function num(v) {
    if (v === null || v === undefined || v === "")
        return undefined;
    const n = typeof v === "number" ? v : parseFloat(String(v));
    return Number.isFinite(n) ? n : undefined;
}
function normaliseOrder(raw, fallbackOrderType = "payin") {
    var _a, _b, _c, _d, _e, _f;
    var _g, _h;
    const orderType = String((raw === null || raw === void 0 ? void 0 : raw.orderType) || (raw === null || raw === void 0 ? void 0 : raw.type) || fallbackOrderType);
    const status = String((raw === null || raw === void 0 ? void 0 : raw.status) || "");
    const rail = ((_a = raw === null || raw === void 0 ? void 0 : raw.destination) === null || _a === void 0 ? void 0 : _a.currencyType) === "crypto" || ((_b = raw === null || raw === void 0 ? void 0 : raw.source) === null || _b === void 0 ? void 0 : _b.currencyType) === "crypto"
        ? "crypto"
        : "fiat";
    return {
        orderId: String((raw === null || raw === void 0 ? void 0 : raw.orderId) || (raw === null || raw === void 0 ? void 0 : raw.id) || ""),
        status,
        orderType,
        mapped: mapTransfiStatus(orderType, status, rail),
        onHold: isComplianceHold(status),
        sourceCurrency: ((_c = raw === null || raw === void 0 ? void 0 : raw.source) === null || _c === void 0 ? void 0 : _c.currency) || (raw === null || raw === void 0 ? void 0 : raw.depositCurrency),
        sourceAmount: num((_g = (_d = raw === null || raw === void 0 ? void 0 : raw.source) === null || _d === void 0 ? void 0 : _d.amount) !== null && _g !== void 0 ? _g : raw === null || raw === void 0 ? void 0 : raw.depositAmount),
        destinationCurrency: ((_e = raw === null || raw === void 0 ? void 0 : raw.destination) === null || _e === void 0 ? void 0 : _e.currency) || (raw === null || raw === void 0 ? void 0 : raw.withdrawCurrency),
        destinationAmount: num((_h = (_f = raw === null || raw === void 0 ? void 0 : raw.destination) === null || _f === void 0 ? void 0 : _f.amount) !== null && _h !== void 0 ? _h : raw === null || raw === void 0 ? void 0 : raw.withdrawAmount),
        failureCode: raw === null || raw === void 0 ? void 0 : raw.failureCode,
        failureMessage: raw === null || raw === void 0 ? void 0 : raw.failureMessage,
        raw,
    };
}
async function getOrder(orderId) {
    const res = await transfiRequest(`/v3/orders/${encodeURIComponent(orderId)}`);
    return normaliseOrder(res === null || res === void 0 ? void 0 : res.data);
}
async function createIndividualUser(params) {
    const res = await transfiRequest("/v3/users/individual", {
        method: "POST",
        body: {
            firstName: params.firstName,
            lastName: params.lastName,
            country: params.country.toUpperCase(),
            date: params.date,
            email: params.email,
            phone: params.phone,
            phoneCode: params.phoneCode,
            address: params.address,
        },
    });
    return res === null || res === void 0 ? void 0 : res.data;
}
async function findUserByEmail(email) {
    const res = await transfiRequest("/v3/users/individual", {
        query: { limit: 100 },
    });
    const list = Array.isArray(res === null || res === void 0 ? void 0 : res.data) ? res.data : [];
    const target = email.trim().toLowerCase();
    return list.find((u) => String(u.email || "").toLowerCase() === target) || null;
}
const USABLE_USER_STATUSES = new Set(["user_approved", "user_active", "approved", "active"]);
const REJECTED_USER_STATUSES = new Set([
    "user_rejected",
    "user_blocked",
    "rejected",
    "blocked",
]);
function isUserUsable(user) {
    return USABLE_USER_STATUSES.has(String((user === null || user === void 0 ? void 0 : user.status) || "").toLowerCase());
}
function isUserRejected(user) {
    const s = String((user === null || user === void 0 ? void 0 : user.status) || "").toLowerCase();
    if (REJECTED_USER_STATUSES.has(s))
        return true;
    return s.includes("reject") || s.includes("block");
}
async function initiateStandardKyc(transfiUserId, redirectUrl) {
    const res = await transfiRequest("/v3/kyc/standard", {
        method: "POST",
        body: { userId: transfiUserId, redirectUrl },
    });
    return (res === null || res === void 0 ? void 0 : res.data) || {};
}
exports.KYC_REQUIRED_CODES = new Set([
    "STANDARD_KYC_REQUIRED",
    "ENHANCED_KYC_REQUIRED",
]);
function isKycRequiredError(error) {
    if (!(error instanceof TransfiError))
        return false;
    if (exports.KYC_REQUIRED_CODES.has(error.code))
        return true;
    return error.details.some((d) => (d === null || d === void 0 ? void 0 : d.code) && exports.KYC_REQUIRED_CODES.has(d.code));
}
function publicBaseUrl() {
    return (process.env.NEXT_PUBLIC_SITE_URL ||
        process.env.APP_PUBLIC_URL ||
        process.env.NEXT_PUBLIC_APP_URL ||
        "http://localhost:3000").replace(/\/+$/, "");
}
function transfiWebhookUrl() {
    return `${publicBaseUrl()}/api/finance/deposit/fiat/transfi/webhook`;
}
function transfiReturnUrl(transactionId, outcome) {
    return `${publicBaseUrl()}/finance/deposit?gateway=transfi&status=${outcome}&ref=${encodeURIComponent(transactionId)}`;
}
function transfiKycReturnUrl() {
    return `${publicBaseUrl()}/finance/deposit?gateway=transfi&status=kyc_complete`;
}
