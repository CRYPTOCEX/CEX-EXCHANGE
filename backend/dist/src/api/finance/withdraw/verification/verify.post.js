"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
const redis_1 = require("@b/utils/redis");
const user_activity_1 = require("@b/utils/user-activity");
const utils_1 = require("@b/api/auth/otp/utils");
const withdraw_2fa_1 = require("@b/utils/withdraw-2fa");
const OTP_MAX_ATTEMPTS = 5;
const OTP_ATTEMPT_WINDOW_SECONDS = 600;
exports.metadata = {
    summary: "Verifies a withdrawal two-factor code",
    description: "Checks a one-time code (or recovery code) and returns a short-lived, single-use token that authorises one withdrawal.",
    operationId: "verifyWithdrawVerification",
    tags: ["Wallets"],
    requiresAuth: true,
    middleware: ["withdrawVerificationVerify"],
    logModule: "WITHDRAW_2FA",
    logTitle: "Verify withdrawal 2FA code",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        otp: {
                            type: "string",
                            description: "One-time code from the user's 2FA method, or a recovery code",
                        },
                    },
                    required: ["otp"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "Code verified",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            twoFactorToken: {
                                type: "string",
                                description: "Single-use token to send as `twoFactorToken` with the withdrawal request",
                            },
                            expiresAt: {
                                type: "number",
                                description: "Epoch milliseconds at which the token expires",
                            },
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        403: { description: "Two-factor authentication is not set up for withdrawals" },
        429: { description: "Too many verification attempts" },
        500: query_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    const { user, body, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("User not authenticated");
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const otp = typeof (body === null || body === void 0 ? void 0 : body.otp) === "string" ? body.otp.trim() : "";
    if (!otp) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Missing verification code");
        throw (0, error_1.createError)({ statusCode: 400, message: "A verification code is required" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Resolving withdrawal 2FA policy");
    const policy = await (0, withdraw_2fa_1.getWithdrawTwoFactorPolicy)();
    if (!policy.requireChallenge) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Withdrawal verification is not required");
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Withdrawal verification is not required on this platform",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Loading enrolled two-factor method");
    const twoFactor = await (0, withdraw_2fa_1.getUserWithdrawTwoFactor)(user.id);
    if (!(0, withdraw_2fa_1.satisfiesPolicy)(policy, twoFactor)) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("No accepted two-factor method enabled");
        throw (0, error_1.createError)({
            statusCode: 403,
            message: `Withdrawals require ${(0, withdraw_2fa_1.describeAcceptedTypes)(policy.acceptedTypes)} two-factor authentication. Enable it in your profile security settings first.`,
        });
    }
    const enrolled = twoFactor;
    const redis = redis_1.RedisSingleton.getInstance();
    const rateKey = `withdraw-2fa-attempts:${user.id}`;
    const attempts = await redis.incr(rateKey);
    if (attempts === 1) {
        await redis.expire(rateKey, OTP_ATTEMPT_WINDOW_SECONDS);
    }
    if (attempts > OTP_MAX_ATTEMPTS) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Too many verification attempts");
        throw (0, error_1.createError)({
            statusCode: 429,
            message: "Too many verification attempts. Please wait a few minutes before trying again.",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Verifying code");
    const secret = (0, utils_1.resolveTwoFactorSecret)(enrolled);
    if (!(await (0, utils_1.consumeEnrolledOtp)(user.id, secret, otp, enrolled.type))) {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Code invalid, checking recovery codes");
        await (0, utils_1.consumeRecoveryCode)({ id: enrolled.id, recoveryCodes: enrolled.recoveryCodes }, otp);
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Recovery code accepted");
    }
    await redis.del(rateKey);
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Issuing withdrawal authorisation token");
    const { token, expiresAt } = await (0, withdraw_2fa_1.issueWithdrawStepUpToken)(user.id);
    void (0, user_activity_1.recordUserActivity)({
        userId: user.id,
        type: "security.withdraw_2fa_verified",
        title: "Withdrawal verified with 2FA",
        description: `Two-factor verification passed for a withdrawal (${enrolled.type})`,
        severity: "info",
        req: data,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Withdrawal two-factor verification passed");
    return { twoFactorToken: token, expiresAt };
};
