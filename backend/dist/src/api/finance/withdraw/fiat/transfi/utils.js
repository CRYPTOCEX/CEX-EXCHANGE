"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PAYOUT_IS_CANCELLABLE = exports.ACCOUNT_TYPES = void 0;
exports.getRecipientRequiredFields = getRecipientRequiredFields;
exports.validateBeneficiary = validateBeneficiary;
exports.resolveOrCreateRecipient = resolveOrCreateRecipient;
exports.listPayoutMethods = listPayoutMethods;
exports.getBalances = getBalances;
exports.getAdvisoryCapacity = getAdvisoryCapacity;
exports.isInsufficientBalance = isInsufficientBalance;
exports.createPayoutOrder = createPayoutOrder;
exports.getPayoutOrder = getPayoutOrder;
const crypto_1 = __importDefault(require("crypto"));
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const console_1 = require("@b/utils/console");
const utils_1 = require("@b/api/finance/deposit/fiat/transfi/utils");
exports.ACCOUNT_TYPES = [
    "bank_account",
    "iban",
    "e_wallet",
    "mobile_wallet",
];
async function getRecipientRequiredFields(country, type = "individual") {
    var _a;
    const res = await (0, utils_1.transfiRequest)("/v3/recipients/mandatory-fields", {
        method: "POST",
        body: { geo: country.toUpperCase(), currencyType: "fiat", type },
    });
    return ((_a = res === null || res === void 0 ? void 0 : res.data) === null || _a === void 0 ? void 0 : _a.inputs) || {};
}
function fingerprint(b) {
    return crypto_1.default
        .createHash("sha256")
        .update([
        b.firstName.trim().toLowerCase(),
        b.lastName.trim().toLowerCase(),
        b.country.trim().toUpperCase(),
        b.accountType,
        b.accountValue.replace(/\s+/g, ""),
    ].join("|"), "utf8")
        .digest("hex");
}
function validateBeneficiary(b) {
    var _a, _b, _c;
    const missing = [];
    if (!((_a = b.firstName) === null || _a === void 0 ? void 0 : _a.trim()))
        missing.push("firstName");
    if (!((_b = b.lastName) === null || _b === void 0 ? void 0 : _b.trim()))
        missing.push("lastName");
    if (!b.country || b.country.trim().length !== 2)
        missing.push("country");
    if (!b.accountType || !exports.ACCOUNT_TYPES.includes(b.accountType))
        missing.push("accountType");
    if (!((_c = b.accountValue) === null || _c === void 0 ? void 0 : _c.trim()))
        missing.push("accountValue");
    if (b.firstName && /\d/.test(b.firstName))
        missing.push("firstName(no digits)");
    if (b.lastName && /\d/.test(b.lastName))
        missing.push("lastName(no digits)");
    return missing;
}
async function resolveOrCreateRecipient(platformUserId, beneficiary, currency) {
    var _a;
    const fp = fingerprint(beneficiary);
    const existing = await db_1.models.transfiRecipient.findOne({
        where: { userId: platformUserId, fingerprint: fp },
    });
    if (existing) {
        await existing.update({ lastUsedAt: new Date() });
        return { recipientId: existing.transfiRecipientId, row: existing, created: false };
    }
    const res = await (0, utils_1.transfiRequest)("/v3/recipients/individual", {
        method: "POST",
        body: {
            firstName: beneficiary.firstName.trim(),
            lastName: beneficiary.lastName.trim(),
            country: beneficiary.country.toUpperCase(),
            currencyType: "fiat",
            accountIdentifier: {
                type: beneficiary.accountType,
                value: beneficiary.accountValue.replace(/\s+/g, ""),
            },
        },
    });
    const recipientId = (_a = res === null || res === void 0 ? void 0 : res.data) === null || _a === void 0 ? void 0 : _a.userId;
    if (!recipientId) {
        throw (0, error_1.createError)({
            statusCode: 502,
            message: "TransFi did not return a recipient id",
        });
    }
    const row = await db_1.models.transfiRecipient.create({
        userId: platformUserId,
        transfiRecipientId: recipientId,
        firstName: beneficiary.firstName.trim(),
        lastName: beneficiary.lastName.trim(),
        country: beneficiary.country.toUpperCase(),
        accountType: beneficiary.accountType,
        accountValue: beneficiary.accountValue.replace(/\s+/g, ""),
        currency: currency || null,
        label: `${beneficiary.accountType.replace(/_/g, " ")} ····${beneficiary.accountValue.slice(-4)}`,
        fingerprint: fp,
        lastUsedAt: new Date(),
    });
    return { recipientId, row, created: true };
}
async function listPayoutMethods(currency) {
    try {
        const res = await (0, utils_1.transfiRequest)("/v3/config/payment-methods", { query: { direction: "withdraw", currency: currency.toUpperCase(), userType: "individual" } });
        return Array.isArray(res === null || res === void 0 ? void 0 : res.data) ? res.data : [];
    }
    catch (error) {
        if (error instanceof utils_1.TransfiError && error.statusCode < 500)
            return [];
        throw error;
    }
}
async function getBalances() {
    var _a;
    const res = await (0, utils_1.transfiRequest)("/v3/balance");
    return Array.isArray((_a = res === null || res === void 0 ? void 0 : res.data) === null || _a === void 0 ? void 0 : _a.balance) ? res.data.balance : [];
}
async function getAdvisoryCapacity(currency) {
    try {
        const rows = await getBalances();
        const row = rows.find((r) => { var _a; return ((_a = r.currency) === null || _a === void 0 ? void 0 : _a.toUpperCase()) === currency.toUpperCase(); });
        if (!row)
            return null;
        const v = row.totalAvailablePrefundingBalance;
        return typeof v === "number" ? v : null;
    }
    catch (error) {
        console_1.logger.warn("TRANSFI", `could not read payout capacity: ${error === null || error === void 0 ? void 0 : error.message}`);
        return null;
    }
}
function isInsufficientBalance(error) {
    if (!(error instanceof utils_1.TransfiError))
        return false;
    return (error.code === "INSUFFICIENT_BALANCE" ||
        error.details.some((d) => (d === null || d === void 0 ? void 0 : d.code) === "INSUFFICIENT_BALANCE"));
}
async function createPayoutOrder(params) {
    const body = {
        userId: params.recipientId,
        orderType: "payout",
        purposeCode: params.purposeCode || "personal",
        partnerId: params.partnerId,
        source: {
            currency: params.sourceCurrency.toUpperCase(),
            amount: params.amount,
        },
        destination: {
            currency: params.destinationCurrency.toUpperCase(),
            paymentType: params.paymentType,
            paymentCode: params.paymentCode,
            ...(params.additionalPaymentDetails
                ? { additionalPaymentDetails: params.additionalPaymentDetails }
                : {}),
        },
    };
    const res = await (0, utils_1.transfiRequest)("/v3/orders", {
        method: "POST",
        body,
    });
    const data = res === null || res === void 0 ? void 0 : res.data;
    if (!(data === null || data === void 0 ? void 0 : data.orderId)) {
        throw new utils_1.TransfiError("TransFi accepted the payout but returned no orderId", "MALFORMED_PAYOUT_RESPONSE", 502);
    }
    return data;
}
async function getPayoutOrder(orderId) {
    const res = await (0, utils_1.transfiRequest)(`/v3/orders/${encodeURIComponent(orderId)}`);
    return (0, utils_1.normaliseOrder)(res === null || res === void 0 ? void 0 : res.data, "payout");
}
exports.PAYOUT_IS_CANCELLABLE = false;
