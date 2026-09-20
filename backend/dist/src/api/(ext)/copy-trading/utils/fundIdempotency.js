"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeClientIdempotencyToken = sanitizeClientIdempotencyToken;
exports.buildFundOperationIdempotencyKey = buildFundOperationIdempotencyKey;
const crypto_1 = require("crypto");
const CLIENT_KEY_PATTERN = /^[A-Za-z0-9_-]{8,100}$/;
function sanitizeClientIdempotencyToken(clientKey) {
    if (typeof clientKey !== "string")
        return null;
    const trimmed = clientKey.trim();
    if (!CLIENT_KEY_PATTERN.test(trimmed))
        return null;
    return trimmed;
}
function buildFundOperationIdempotencyKey(input) {
    const scope = `ct_${input.operation}_${input.allocationId}_${input.currencyType}`;
    const token = sanitizeClientIdempotencyToken(input.clientKey);
    return {
        key: `${scope}_${token !== null && token !== void 0 ? token : (0, crypto_1.randomUUID)()}`,
        clientSupplied: token !== null,
    };
}
