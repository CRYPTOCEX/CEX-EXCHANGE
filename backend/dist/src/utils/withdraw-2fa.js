"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.satisfiesPolicy = exports.describeAcceptedTypes = exports.STEP_UP_PURPOSE_WITHDRAW = void 0;
exports.getWithdrawTwoFactorPolicy = getWithdrawTwoFactorPolicy;
exports.getUserWithdrawTwoFactor = getUserWithdrawTwoFactor;
exports.issueWithdrawStepUpToken = issueWithdrawStepUpToken;
exports.consumeWithdrawStepUpToken = consumeWithdrawStepUpToken;
exports.assertWithdrawTwoFactor = assertWithdrawTwoFactor;
const error_1 = require("@b/utils/error");
const step_up_2fa_1 = require("@b/utils/step-up-2fa");
Object.defineProperty(exports, "describeAcceptedTypes", { enumerable: true, get: function () { return step_up_2fa_1.describeAcceptedTypes; } });
Object.defineProperty(exports, "satisfiesPolicy", { enumerable: true, get: function () { return step_up_2fa_1.satisfiesPolicy; } });
exports.STEP_UP_PURPOSE_WITHDRAW = "withdraw";
const WITHDRAW_STEP_UP = {
    purpose: exports.STEP_UP_PURPOSE_WITHDRAW,
    redisPrefix: "withdraw-2fa-step-up:",
    logModule: "WITHDRAW_2FA",
    smsKind: "WITHDRAW_OTP",
    settings: {
        requireEnrollment: "withdrawTwoFactorRequired",
        requireChallenge: "withdrawTwoFactorChallenge",
        appAllowed: "withdrawTwoFactorAppAllowed",
        emailAllowed: "withdrawTwoFactorEmailAllowed",
        smsAllowed: "withdrawTwoFactorSmsAllowed",
    },
    warn: {
        platformOff: "Withdrawal 2FA is switched on but two-factor authentication is disabled platform-wide (twoFactorStatus). The withdrawal requirement is being IGNORED so withdrawals are not blocked for every user — enable Two-Factor Authentication in Security settings.",
        noAcceptedTypes: (configured) => `Withdrawal 2FA is switched on but none of the accepted methods (${configured}) is available platform-wide. The withdrawal requirement is being IGNORED so withdrawals are not blocked for every user.`,
    },
};
async function getWithdrawTwoFactorPolicy() {
    return (0, step_up_2fa_1.getStepUpPolicy)(WITHDRAW_STEP_UP);
}
async function getUserWithdrawTwoFactor(userId) {
    return (0, step_up_2fa_1.getUserTwoFactor)(userId);
}
async function issueWithdrawStepUpToken(userId) {
    return (0, step_up_2fa_1.issueStepUpToken)(WITHDRAW_STEP_UP, userId);
}
async function consumeWithdrawStepUpToken(userId, token) {
    return (0, step_up_2fa_1.consumeStepUpToken)(WITHDRAW_STEP_UP, userId, token);
}
async function assertWithdrawTwoFactor(userId, stepUpToken, ctx) {
    const policy = await getWithdrawTwoFactorPolicy();
    if (!policy.requireEnrollment && !policy.requireChallenge)
        return;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking withdrawal two-factor requirements");
    const twoFactor = await getUserWithdrawTwoFactor(userId);
    if (!(0, step_up_2fa_1.satisfiesPolicy)(policy, twoFactor)) {
        const accepted = (0, step_up_2fa_1.describeAcceptedTypes)(policy.acceptedTypes);
        const message = (twoFactor === null || twoFactor === void 0 ? void 0 : twoFactor.enabled)
            ? `Withdrawals require ${accepted} two-factor authentication. Your account uses ${step_up_2fa_1.TYPE_LABELS[twoFactor.type]} 2FA — switch method in your profile security settings to withdraw.`
            : `Withdrawals require two-factor authentication. Enable ${accepted} 2FA in your profile security settings to withdraw.`;
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Withdrawal blocked: two-factor authentication not enabled");
        throw (0, error_1.createError)({ statusCode: 403, message });
    }
    if (!policy.requireChallenge)
        return;
    if (!stepUpToken) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Withdrawal blocked: missing two-factor verification");
        throw (0, error_1.createError)({
            statusCode: 403,
            message: "This withdrawal must be confirmed with a two-factor code. Request a verification code and submit it with the withdrawal.",
        });
    }
    const consumed = await consumeWithdrawStepUpToken(userId, stepUpToken);
    if (!consumed) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Withdrawal blocked: invalid or already-used 2FA verification");
        throw (0, error_1.createError)({
            statusCode: 403,
            message: "Your two-factor verification has expired or was already used. Please verify again to continue.",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Two-factor verification accepted");
}
