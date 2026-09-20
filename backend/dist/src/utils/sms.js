"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSmsConfigError = void 0;
exports.isSmsAvailable = isSmsAvailable;
exports.__TEST_ONLY_fallbackText = __TEST_ONLY_fallbackText;
exports.sendSms = sendSms;
exports.sendSmsCode = sendSmsCode;
const crypto_1 = __importDefault(require("crypto"));
const error_1 = require("@b/utils/error");
const console_1 = require("@b/utils/console");
const redis_1 = require("@b/utils/redis");
const sms_1 = require("@b/services/notification/providers/sms");
const resolve_1 = require("@b/services/notification/providers/sms/resolve");
Object.defineProperty(exports, "getSmsConfigError", { enumerable: true, get: function () { return resolve_1.getSmsConfigError; } });
const FALLBACK_TEXT = {
    AUTH_OTP: (code) => `Your OTP code is: ${code}`,
    PHONE_VERIFICATION: (code) => `Your verification code is: ${code}`,
    WITHDRAW_OTP: (code) => `Your withdrawal verification code is: ${code}`,
    TRANSFER_OTP: (code) => `Your transfer verification code is: ${code}`,
    P2P_OTP: (code) => `Your P2P release verification code is: ${code}`,
    PASSWORD_CHANGE_OTP: (code) => `Your password change verification code is: ${code}`,
    TEST: () => "Test SMS from our service",
    GENERIC: (text) => text,
};
function toE164(phone) {
    const digits = String(phone).replace(/\D/g, "").slice(0, 15);
    return `+${digits}`;
}
const DUPLICATE_WINDOW_SECONDS = 15;
async function alreadyJustSent(to, body) {
    const digest = crypto_1.default
        .createHash("sha256")
        .update(`${to}|${body}`)
        .digest("hex")
        .slice(0, 32);
    const key = `sms:dedupe:${digest}`;
    try {
        const redis = redis_1.RedisSingleton.getInstance();
        const stored = await redis.set(key, "1", "EX", DUPLICATE_WINDOW_SECONDS, "NX");
        return stored === null;
    }
    catch (_a) {
        return false;
    }
}
function isSmsAvailable(kind) {
    return (0, resolve_1.isSmsConfigured)(kind);
}
function __TEST_ONLY_fallbackText(kind, code) {
    return FALLBACK_TEXT[kind](code);
}
async function sendSms(req) {
    var _a;
    const configError = (0, resolve_1.getSmsConfigError)(req.kind);
    if (configError) {
        throw (0, error_1.createError)({ statusCode: 500, message: configError });
    }
    const fingerprint = `${req.kind}|${req.fallbackText}|${JSON.stringify((_a = req.vars) !== null && _a !== void 0 ? _a : {})}`;
    if (await alreadyJustSent(req.to, fingerprint)) {
        console_1.logger.info("SMS", `Suppressed a duplicate ${req.kind} to the same number within ` +
            `${DUPLICATE_WINDOW_SECONDS}s — the identical code is already on its way`);
        return;
    }
    const result = await (0, sms_1.getSmsProviderFor)(req.kind).send(req);
    if (!result.success) {
        throw (0, error_1.createError)({
            statusCode: 500,
            message: result.error || "Failed to send SMS",
        });
    }
}
async function sendSmsCode(phone, code, kind = "AUTH_OTP") {
    const to = toE164(phone);
    if (!/^\+\d{7,15}$/.test(to)) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Phone number must be in international format, e.g. +254711972926",
        });
    }
    await sendSms({
        to,
        kind,
        vars: { code },
        fallbackText: FALLBACK_TEXT[kind](code),
    });
}
