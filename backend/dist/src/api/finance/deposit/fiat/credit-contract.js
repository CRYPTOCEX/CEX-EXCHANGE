"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DepositContractError = void 0;
exports.resolveDepositCurrency = resolveDepositCurrency;
exports.creditableAmount = creditableAmount;
exports.depositIdempotencyKey = depositIdempotencyKey;
exports.assertSignaturePresent = assertSignaturePresent;
exports.creditReferenceId = creditReferenceId;
function readMetadata(raw) {
    if (!raw)
        return {};
    if (typeof raw === "object")
        return raw;
    if (typeof raw !== "string")
        return {};
    try {
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === "object" ? parsed : {};
    }
    catch (_a) {
        return {};
    }
}
class DepositContractError extends Error {
    constructor(message) {
        super(message);
        this.name = "DepositContractError";
    }
}
exports.DepositContractError = DepositContractError;
function resolveDepositCurrency(row, fallback) {
    const direct = typeof (row === null || row === void 0 ? void 0 : row.currency) === "string" ? row.currency.trim() : "";
    if (direct)
        return direct;
    const meta = readMetadata(row === null || row === void 0 ? void 0 : row.metadata);
    const fromMeta = typeof (meta === null || meta === void 0 ? void 0 : meta.currency) === "string" ? meta.currency.trim() : "";
    if (fromMeta)
        return fromMeta;
    if (typeof fallback === "string" && fallback.trim())
        return fallback.trim();
    throw new DepositContractError("No currency on the transaction row or its metadata, and no explicit fallback was supplied.");
}
function creditableAmount(row, opts = {}) {
    const amount = Number(row === null || row === void 0 ? void 0 : row.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
        throw new DepositContractError(`Recorded amount is not a positive finite number (got ${JSON.stringify(row === null || row === void 0 ? void 0 : row.amount)}).`);
    }
    if (opts.strict && opts.reported !== undefined && opts.reported !== null) {
        const reported = Number(opts.reported);
        if (Number.isFinite(reported) && reported - amount > 1e-9) {
            throw new DepositContractError(`Provider reported ${reported} against a recorded amount of ${amount}; refusing to credit a payment we did not record.`);
        }
    }
    return amount;
}
function depositIdempotencyKey(provider, reference) {
    const p = typeof provider === "string" ? provider.trim().toLowerCase() : "";
    const r = typeof reference === "string" ? reference.trim() : "";
    if (!p)
        throw new DepositContractError("Provider is required to build a deposit idempotency key.");
    if (!r) {
        throw new DepositContractError(`Reference is required to build a deposit idempotency key for ${p}.`);
    }
    return `${p}_deposit_${r}`;
}
function assertSignaturePresent(input) {
    if (!input.secretConfigured)
        return;
    const sig = typeof input.signature === "string" ? input.signature.trim() : "";
    if (!sig) {
        throw new DepositContractError("A signing secret is configured but the request carried no signature.");
    }
    if (input.valid === false) {
        throw new DepositContractError("Signature did not verify.");
    }
}
function creditReferenceId(pending, providerReference) {
    if (!providerReference) {
        throw new DepositContractError("A provider reference is required for the credit row.");
    }
    if ((pending === null || pending === void 0 ? void 0 : pending.referenceId) && pending.referenceId === providerReference) {
        return `credit_${providerReference}`;
    }
    return providerReference;
}
