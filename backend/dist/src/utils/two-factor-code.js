"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deliveredCodeAuthenticator = exports.appAuthenticator = exports.DELIVERED_CODE_WINDOW = exports.DELIVERED_CODE_STEP_SECONDS = exports.APP_CODE_WINDOW = exports.APP_CODE_STEP_SECONDS = void 0;
exports.isDeliveredCodeType = isDeliveredCodeType;
exports.generateTwoFactorSecret = generateTwoFactorSecret;
exports.generateTwoFactorCode = generateTwoFactorCode;
exports.verifyTwoFactorCode = verifyTwoFactorCode;
exports.twoFactorKeyUri = twoFactorKeyUri;
const otplib_1 = require("otplib");
exports.APP_CODE_STEP_SECONDS = 30;
exports.APP_CODE_WINDOW = 2;
exports.DELIVERED_CODE_STEP_SECONDS = 300;
exports.DELIVERED_CODE_WINDOW = [1, 1];
const { createDigest, createRandomBytes, keyDecoder, keyEncoder } = otplib_1.authenticator.options;
if (!createDigest || !createRandomBytes || !keyDecoder || !keyEncoder) {
    throw new Error("otplib preset is missing a plugin; two-factor codes cannot be computed");
}
const plugins = { createDigest, createRandomBytes, keyDecoder, keyEncoder };
exports.appAuthenticator = otplib_1.authenticator.create({
    ...plugins,
    step: exports.APP_CODE_STEP_SECONDS,
    window: exports.APP_CODE_WINDOW,
});
exports.deliveredCodeAuthenticator = otplib_1.authenticator.create({
    ...plugins,
    step: exports.DELIVERED_CODE_STEP_SECONDS,
    window: [exports.DELIVERED_CODE_WINDOW[0], exports.DELIVERED_CODE_WINDOW[1]],
});
function isDeliveredCodeType(type) {
    return type === "EMAIL" || type === "SMS";
}
function authenticatorFor(type) {
    return isDeliveredCodeType(type)
        ? exports.deliveredCodeAuthenticator
        : exports.appAuthenticator;
}
function generateTwoFactorSecret() {
    return exports.appAuthenticator.generateSecret();
}
function generateTwoFactorCode(secret, type) {
    return authenticatorFor(type).generate(secret);
}
function verifyTwoFactorCode(secret, token, type) {
    if (!secret || (typeof token !== "string" && typeof token !== "number")) {
        return false;
    }
    try {
        return authenticatorFor(type).check(String(token), secret);
    }
    catch (_a) {
        return false;
    }
}
function twoFactorKeyUri(accountName, issuer, secret) {
    return exports.appAuthenticator.keyuri(accountName, issuer, secret);
}
