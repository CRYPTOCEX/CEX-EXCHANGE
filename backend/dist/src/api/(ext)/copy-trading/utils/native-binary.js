"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BINARY_MARKET_TYPE = void 0;
exports.assertNotBinaryOnNativeApp = assertNotBinaryOnNativeApp;
exports.carriesBinaryDiscriminator = carriesBinaryDiscriminator;
exports.stripBinaryForNative = stripBinaryForNative;
const error_1 = require("@b/utils/error");
const session_1 = require("@b/utils/session");
exports.BINARY_MARKET_TYPE = "BINARY";
function isBinaryOnlyLeader(row) {
    return (row === null || row === void 0 ? void 0 : row.tradingType) === exports.BINARY_MARKET_TYPE;
}
function isBinaryRow(row) {
    return (row === null || row === void 0 ? void 0 : row.marketType) === exports.BINARY_MARKET_TYPE;
}
function assertNotBinaryOnNativeApp(req, value, what) {
    if (!(0, session_1.isNativeAppRequest)(req))
        return;
    const raw = String(value !== null && value !== void 0 ? value : "").trim().toUpperCase();
    if (raw !== exports.BINARY_MARKET_TYPE && raw !== "BOTH")
        return;
    throw (0, error_1.createError)({
        statusCode: 403,
        message: `Binary options are not available in the mobile app, so you cannot ${what}. Spot copy trading is unaffected.`,
    });
}
const MAX_DEPTH = 12;
function carriesBinaryDiscriminator(row) {
    return (row !== null &&
        typeof row === "object" &&
        ("marketType" in row || "tradingType" in row));
}
function isBanned(value) {
    return isBinaryRow(value) || isBinaryOnlyLeader(value);
}
function redact(value, depth) {
    if (depth > MAX_DEPTH || value === null || typeof value !== "object") {
        return value;
    }
    if (Array.isArray(value)) {
        return value.filter((entry) => !isBanned(entry)).map((entry) => redact(entry, depth + 1));
    }
    const out = {};
    for (const [key, entry] of Object.entries(value)) {
        if (key === "tradingType" && entry === "BOTH") {
            out[key] = "SPOT";
            continue;
        }
        if (isBanned(entry)) {
            out[key] = null;
            continue;
        }
        out[key] = redact(entry, depth + 1);
    }
    return out;
}
function stripBinaryForNative(payload, req) {
    if (!(0, session_1.isNativeAppRequest)(req))
        return payload;
    if (isBanned(payload))
        return null;
    return redact(payload, 0);
}
