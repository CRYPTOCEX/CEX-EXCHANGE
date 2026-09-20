"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.temporaryRetryMs = exports.throttleCooldownMs = void 0;
exports.classifyDeliveryFailure = classifyDeliveryFailure;
function envMs(name, fallback) {
    const parsed = Number(process.env[name]);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
const throttleCooldownMs = () => envMs("MAIL_THROTTLE_COOLDOWN_MS", 5 * 60000);
exports.throttleCooldownMs = throttleCooldownMs;
const temporaryRetryMs = () => envMs("MAIL_TEMPORARY_RETRY_MS", 30000);
exports.temporaryRetryMs = temporaryRetryMs;
const THROTTLE_PHRASES = [
    "too many login",
    "too many auth",
    "too many messages",
    "too many connection",
    "too many requests",
    "rate limit",
    "ratelimit",
    "try again later",
    "throttl",
    "quota exceeded",
    "temporarily deferred",
    "temporary blocked",
    "concurrent connections",
];
const TRANSIENT_CODES = new Set([
    "ECONNECTION",
    "ECONNRESET",
    "ECONNREFUSED",
    "ETIMEDOUT",
    "ESOCKET",
    "EDNS",
    "EAI_AGAIN",
    "EPIPE",
    "EENVELOPE_TIMEOUT",
]);
function firstLine(value) {
    return String(value !== null && value !== void 0 ? value : "")
        .split("\n")[0]
        .trim();
}
function responseCode(error) {
    var _a, _b;
    var _c, _d;
    const numeric = [
        error === null || error === void 0 ? void 0 : error.responseCode,
        typeof (error === null || error === void 0 ? void 0 : error.code) === "number" ? error.code : undefined,
        error === null || error === void 0 ? void 0 : error.statusCode,
        error === null || error === void 0 ? void 0 : error.status,
        (_a = error === null || error === void 0 ? void 0 : error.response) === null || _a === void 0 ? void 0 : _a.status,
        (_b = error === null || error === void 0 ? void 0 : error.response) === null || _b === void 0 ? void 0 : _b.statusCode,
    ].find((value) => Number.isFinite(Number(value)) && Number(value) > 0);
    if (numeric !== undefined)
        return Number(numeric);
    const leading = /^\s*(\d{3})[ -]/.exec(String((_d = (_c = error === null || error === void 0 ? void 0 : error.response) !== null && _c !== void 0 ? _c : error === null || error === void 0 ? void 0 : error.message) !== null && _d !== void 0 ? _d : ""));
    return leading ? Number(leading[1]) : null;
}
function classifyDeliveryFailure(error) {
    const text = [error === null || error === void 0 ? void 0 : error.response, error === null || error === void 0 ? void 0 : error.message, error]
        .map((part) => String(part !== null && part !== void 0 ? part : ""))
        .join(" ")
        .toLowerCase();
    const code = responseCode(error);
    const message = firstLine(error === null || error === void 0 ? void 0 : error.response) || firstLine(error === null || error === void 0 ? void 0 : error.message) || "unknown error";
    if (typeof (error === null || error === void 0 ? void 0 : error.code) === "string" && TRANSIENT_CODES.has(error.code)) {
        return { kind: "temporary", retryAfterMs: (0, exports.temporaryRetryMs)(), message, code };
    }
    const throttleWorded = THROTTLE_PHRASES.some((phrase) => text.includes(phrase));
    if (code === 429) {
        return { kind: "throttled", retryAfterMs: (0, exports.throttleCooldownMs)(), message, code };
    }
    if (code !== null && code >= 400 && code < 500) {
        return {
            kind: throttleWorded ? "throttled" : "temporary",
            retryAfterMs: throttleWorded ? (0, exports.throttleCooldownMs)() : (0, exports.temporaryRetryMs)(),
            message,
            code,
        };
    }
    if (code !== null && code >= 500 && code < 600) {
        const isSmtp = Number.isFinite(Number(error === null || error === void 0 ? void 0 : error.responseCode)) || !!(error === null || error === void 0 ? void 0 : error.command);
        return isSmtp
            ? { kind: "permanent", retryAfterMs: 0, message, code }
            : { kind: "temporary", retryAfterMs: (0, exports.temporaryRetryMs)(), message, code };
    }
    if ((error === null || error === void 0 ? void 0 : error.code) === "EAUTH" && !throttleWorded) {
        return { kind: "permanent", retryAfterMs: 0, message, code };
    }
    if ((error === null || error === void 0 ? void 0 : error.code) === "EENVELOPE" || text.includes("no recipients defined")) {
        return { kind: "permanent", retryAfterMs: 0, message, code };
    }
    return { kind: "temporary", retryAfterMs: (0, exports.temporaryRetryMs)(), message, code };
}
