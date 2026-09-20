"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
const redis_1 = require("@b/utils/redis");
const user_activity_1 = require("@b/utils/user-activity");
const utils_1 = require("@b/api/auth/otp/utils");
const transfer_2fa_1 = require("@b/utils/transfer-2fa");
const transfer_security_1 = require("@b/utils/transfer-security");
const transfer_pin_1 = require("@b/utils/transfer-pin");
const transfer_pin_proof_1 = require("@b/utils/transfer-pin-proof");
const OTP_MAX_ATTEMPTS = 5;
const OTP_ATTEMPT_WINDOW_SECONDS = 600;
exports.metadata = {
    summary: "Verifies a transfer PIN or two-factor code",
    description: "Checks a Transfer PIN, a one-time code, or a recovery code, and returns a short-lived, single-use token that authorises one transfer.",
    operationId: "verifyTransferVerification",
    tags: ["Finance", "Transfer"],
    requiresAuth: true,
    middleware: ["transferVerificationVerify"],
    logModule: "TRANSFER_2FA",
    logTitle: "Verify transfer credential",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        pin: {
                            type: "string",
                            description: "The user's four-digit Transfer PIN",
                        },
                        otp: {
                            type: "string",
                            description: "One-time code from the user's 2FA method, or a recovery code",
                        },
                        transferType: {
                            type: "string",
                            description: 'Which transfer this confirmation is for: "client" (to another user) or "wallet" (between your own wallet types). Defaults to "wallet".',
                            nullable: true,
                        },
                        clientId: {
                            type: "string",
                            description: "The recipient's user id, for a client transfer. The token is bound to it, so the confirmation cannot authorise a payment to anyone else.",
                            nullable: true,
                        },
                        toAddress: {
                            type: "string",
                            description: "The destination address, for an ecosystem withdrawal that turns out to be internal. Binds the token to that address instead of to a user id. Takes precedence over `clientId`.",
                            nullable: true,
                        },
                    },
                },
            },
        },
    },
    responses: {
        200: {
            description: "Credential verified",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            transferToken: {
                                type: "string",
                                description: "Single-use token to send as `transferToken` with the transfer request",
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
        403: { description: "The supplied credential is not accepted for transfers" },
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
    const pin = typeof (body === null || body === void 0 ? void 0 : body.pin) === "string" ? body.pin.trim() : "";
    const otp = typeof (body === null || body === void 0 ? void 0 : body.otp) === "string" ? body.otp.trim() : "";
    const kind = (body === null || body === void 0 ? void 0 : body.transferType) === "client" ? "client" : "wallet";
    const binding = typeof (body === null || body === void 0 ? void 0 : body.toAddress) === "string" && body.toAddress.trim()
        ? (0, transfer_2fa_1.transferBindingForAddress)(body.toAddress)
        : (0, transfer_2fa_1.transferBinding)(kind, body === null || body === void 0 ? void 0 : body.clientId);
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Resolving transfer security policy");
    const policy = await (0, transfer_security_1.getTransferSecurityPolicy)();
    if (!policy.active) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Transfer verification is not required");
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Transfer verification is not required on this platform",
        });
    }
    if (!pin && !otp) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("No credential supplied");
        throw (0, error_1.createError)({
            statusCode: 400,
            message: policy.pinAccepted
                ? "Enter your Transfer PIN to confirm this transfer."
                : "Enter the verification code to confirm this transfer.",
        });
    }
    if (pin) {
        if (!policy.pinAccepted) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("PIN supplied but not accepted by policy");
            throw (0, error_1.createError)({
                statusCode: 403,
                message: "Transfers on this platform are confirmed with a one-time code, not a PIN.",
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Verifying transfer PIN");
        const result = await (0, transfer_pin_1.verifyTransferPin)(user.id, pin, data);
        if (!result.ok) {
            const { statusCode, message } = (0, transfer_pin_proof_1.describePinFailure)(result);
            ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Transfer PIN rejected: ${result.reason}`);
            throw (0, error_1.createError)({
                statusCode,
                message: result.reason === "NOT_SET"
                    ? "No Transfer PIN is set on this account. Set one in your profile security settings."
                    : message,
            });
        }
        const { token, expiresAt } = await (0, transfer_2fa_1.issueTransferStepUpToken)(user.id, binding);
        void (0, user_activity_1.recordUserActivity)({
            userId: user.id,
            type: "security.transfer_verified",
            title: "Transfer verified with PIN",
            description: "Transfer PIN accepted for a wallet transfer",
            severity: "info",
            req: data,
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Transfer PIN accepted");
        return { transferToken: token, expiresAt };
    }
    if (!policy.twoFactorAccepted) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Code supplied but not accepted by policy");
        throw (0, error_1.createError)({
            statusCode: 403,
            message: "Transfers on this platform are confirmed with your Transfer PIN, not a code.",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Loading enrolled two-factor method");
    const twoFactor = await (0, transfer_2fa_1.getUserTransferTwoFactor)(user.id);
    if (!(0, transfer_2fa_1.satisfiesPolicy)(policy.twoFactor, twoFactor)) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("No accepted two-factor method enabled");
        throw (0, error_1.createError)({
            statusCode: 403,
            message: `Confirming a transfer by code requires ${(0, transfer_2fa_1.describeAcceptedTypes)(policy.twoFactor.acceptedTypes)} two-factor authentication. Enable it in your profile security settings first.`,
        });
    }
    const enrolled = twoFactor;
    const redis = redis_1.RedisSingleton.getInstance();
    const rateKey = `transfer-2fa-attempts:${user.id}`;
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
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Issuing transfer authorisation token");
    const { token, expiresAt } = await (0, transfer_2fa_1.issueTransferStepUpToken)(user.id, binding);
    void (0, user_activity_1.recordUserActivity)({
        userId: user.id,
        type: "security.transfer_verified",
        title: "Transfer verified with 2FA",
        description: `Two-factor verification passed for a transfer (${enrolled.type})`,
        severity: "info",
        req: data,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Transfer two-factor verification passed");
    return { transferToken: token, expiresAt };
};
