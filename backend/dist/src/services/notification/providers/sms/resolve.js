"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isOtpKind = isOtpKind;
exports.resolveOtpProvider = resolveOtpProvider;
exports.resolveSmsProviderFor = resolveSmsProviderFor;
exports.isSmsConfigured = isSmsConfigured;
exports.getSmsConfigError = getSmsConfigError;
exports.describeSmsConfiguration = describeSmsConfiguration;
exports.__resetSmsResolverWarnings = __resetSmsResolverWarnings;
const console_1 = require("@b/utils/console");
const types_1 = require("./types");
const BASE_PROVIDER = "twilio";
const OTP_KINDS = new Set([
    "AUTH_OTP",
    "PHONE_VERIFICATION",
    "WITHDRAW_OTP",
    "TRANSFER_OTP",
    "P2P_OTP",
    "PASSWORD_CHANGE_OTP",
]);
function isOtpKind(kind) {
    return kind ? OTP_KINDS.has(kind) : false;
}
function hasTwilioCredentials() {
    const sid = process.env.APP_TWILIO_ACCOUNT_SID;
    return Boolean(sid &&
        sid.startsWith("AC") &&
        process.env.APP_TWILIO_AUTH_TOKEN &&
        (process.env.APP_TWILIO_PHONE_NUMBER ||
            process.env.APP_TWILIO_MESSAGING_SERVICE_SID));
}
function hasMsg91Credentials() {
    var _a, _b;
    return Boolean(((_a = process.env.MSG91_AUTH_KEY) === null || _a === void 0 ? void 0 : _a.trim()) &&
        ((_b = process.env.MSG91_OTP_TEMPLATE_ID) === null || _b === void 0 ? void 0 : _b.trim()));
}
const CREDENTIAL_PROBES = {
    twilio: hasTwilioCredentials,
    msg91: hasMsg91Credentials,
};
let warnedAboutUnknownValue = false;
function resolveOtpProvider(raw = process.env.SMS_OTP_PROVIDER) {
    const value = (raw || "").trim().toLowerCase();
    if (!value)
        return BASE_PROVIDER;
    const match = types_1.SMS_PROVIDER_IDS.find((id) => id === value);
    if (match)
        return match;
    if (!warnedAboutUnknownValue) {
        warnedAboutUnknownValue = true;
        console_1.logger.warn("SMS", `Unknown SMS_OTP_PROVIDER "${raw}" — expected one of ${types_1.SMS_PROVIDER_IDS.join(", ")}. Falling back to ${BASE_PROVIDER}.`);
    }
    return BASE_PROVIDER;
}
function resolveSmsProviderFor(kind) {
    return isOtpKind(kind) ? resolveOtpProvider() : BASE_PROVIDER;
}
function isSmsConfigured(kind) {
    return CREDENTIAL_PROBES[resolveSmsProviderFor(kind)]();
}
function getSmsConfigError(kind) {
    const provider = resolveSmsProviderFor(kind);
    if (CREDENTIAL_PROBES[provider]())
        return null;
    if (provider === "msg91") {
        return ("MSG91 is not configured for one-time codes: set MSG91_AUTH_KEY and " +
            "MSG91_OTP_TEMPLATE_ID.");
    }
    return ("SMS is not configured: set APP_TWILIO_ACCOUNT_SID (must start with 'AC'), " +
        "APP_TWILIO_AUTH_TOKEN, and APP_TWILIO_PHONE_NUMBER or " +
        "APP_TWILIO_MESSAGING_SERVICE_SID.");
}
function describeSmsConfiguration() {
    return {
        otpProvider: resolveOtpProvider(),
        baseProvider: BASE_PROVIDER,
        otpConfigured: isSmsConfigured("AUTH_OTP"),
        baseConfigured: isSmsConfigured("GENERIC"),
        otpConfigError: getSmsConfigError("AUTH_OTP"),
        baseConfigError: getSmsConfigError("GENERIC"),
        providers: {
            twilio: hasTwilioCredentials(),
            msg91: hasMsg91Credentials(),
        },
    };
}
function __resetSmsResolverWarnings() {
    warnedAboutUnknownValue = false;
}
