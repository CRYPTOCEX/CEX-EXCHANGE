"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TYPE_LABELS = exports.satisfiesPolicy = exports.describeAcceptedTypes = exports.TRANSFER_STEP_UP = exports.STEP_UP_PURPOSE_TRANSFER = void 0;
exports.getTransferTwoFactorPolicy = getTransferTwoFactorPolicy;
exports.getUserTransferTwoFactor = getUserTransferTwoFactor;
exports.transferBinding = transferBinding;
exports.transferBindingForAddress = transferBindingForAddress;
exports.issueTransferStepUpToken = issueTransferStepUpToken;
exports.consumeTransferStepUpToken = consumeTransferStepUpToken;
const crypto_1 = require("crypto");
const step_up_2fa_1 = require("@b/utils/step-up-2fa");
Object.defineProperty(exports, "describeAcceptedTypes", { enumerable: true, get: function () { return step_up_2fa_1.describeAcceptedTypes; } });
Object.defineProperty(exports, "satisfiesPolicy", { enumerable: true, get: function () { return step_up_2fa_1.satisfiesPolicy; } });
Object.defineProperty(exports, "TYPE_LABELS", { enumerable: true, get: function () { return step_up_2fa_1.TYPE_LABELS; } });
const redis_1 = require("@b/utils/redis");
const passwords_1 = require("@b/utils/passwords");
const token_1 = require("@b/utils/token");
exports.STEP_UP_PURPOSE_TRANSFER = "transfer";
exports.TRANSFER_STEP_UP = {
    purpose: exports.STEP_UP_PURPOSE_TRANSFER,
    redisPrefix: "transfer-2fa-step-up:",
    logModule: "TRANSFER_2FA",
    smsKind: "TRANSFER_OTP",
    settings: {
        requireEnrollment: "transferTwoFactorRequired",
        requireChallenge: "transferTwoFactorChallenge",
        appAllowed: "transferTwoFactorAppAllowed",
        emailAllowed: "transferTwoFactorEmailAllowed",
        smsAllowed: "transferTwoFactorSmsAllowed",
    },
    warn: {
        platformOff: "Transfer 2FA is switched on but two-factor authentication is disabled platform-wide (twoFactorStatus). The transfer requirement is being IGNORED so transfers are not blocked for every user — enable Two-Factor Authentication in Security settings, or switch Transfer Security to PIN.",
        noAcceptedTypes: (configured) => `Transfer 2FA is switched on but none of the accepted methods (${configured}) is available platform-wide. The transfer requirement is being IGNORED so transfers are not blocked for every user — switch Transfer Security to PIN if you want a requirement that always applies.`,
    },
};
async function getTransferTwoFactorPolicy() {
    return (0, step_up_2fa_1.getStepUpPolicy)(exports.TRANSFER_STEP_UP);
}
async function getUserTransferTwoFactor(userId) {
    return (0, step_up_2fa_1.getUserTwoFactor)(userId);
}
function transferBinding(kind, recipientId) {
    if (kind !== "client")
        return "wallet";
    const recipient = String(recipientId !== null && recipientId !== void 0 ? recipientId : "").trim().toLowerCase();
    return `client:${recipient}`;
}
function transferBindingForAddress(address) {
    return `address:${String(address !== null && address !== void 0 ? address : "").trim().toLowerCase()}`;
}
function bindingKey(jti, binding) {
    return `${exports.TRANSFER_STEP_UP.redisPrefix}${jti}:${(0, crypto_1.createHash)("sha256")
        .update(binding)
        .digest("hex")
        .slice(0, 32)}`;
}
async function issueTransferStepUpToken(userId, binding) {
    const jti = (0, passwords_1.makeUuid)();
    const token = await (0, token_1.generateStepUpToken)(userId, exports.TRANSFER_STEP_UP.purpose, jti);
    await redis_1.RedisSingleton.getInstance().setex(bindingKey(jti, binding), token_1.STEP_UP_TOKEN_TTL_SECONDS, userId);
    return { token, expiresAt: Date.now() + token_1.STEP_UP_TOKEN_TTL_SECONDS * 1000 };
}
async function consumeTransferStepUpToken(userId, token, binding) {
    const payload = await (0, token_1.verifyStepUpToken)(token, exports.TRANSFER_STEP_UP.purpose);
    if (!payload || payload.userId !== userId)
        return false;
    const removed = await redis_1.RedisSingleton.getInstance().del(bindingKey(payload.jti, binding));
    return removed === 1;
}
