"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
const two_factor_code_1 = require("@b/utils/two-factor-code");
const emails_1 = require("@b/utils/emails");
const console_1 = require("@b/utils/console");
const db_1 = require("@b/db");
const sms_1 = require("@b/utils/sms");
const utils_1 = require("@b/api/auth/otp/utils");
const transfer_2fa_1 = require("@b/utils/transfer-2fa");
const transfer_security_1 = require("@b/utils/transfer-security");
exports.metadata = {
    summary: "Sends a transfer verification code",
    description: "Delivers a one-time code over the user's enrolled two-factor channel so a transfer can be confirmed. Authenticator-app users receive no message — they read the code from their app.",
    operationId: "startTransferVerification",
    tags: ["Finance", "Transfer"],
    requiresAuth: true,
    middleware: ["transferVerificationSend"],
    logModule: "TRANSFER_2FA",
    logTitle: "Send transfer verification code",
    responses: {
        200: {
            description: "Verification code issued",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            type: {
                                type: "string",
                                description: "The 2FA channel the code was issued on",
                            },
                            delivered: {
                                type: "boolean",
                                description: "True when a code was actually sent; false for authenticator apps",
                            },
                            message: { type: "string" },
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        403: { description: "Two-factor authentication is not set up for transfers" },
        500: query_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    const { user, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("User not authenticated");
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Resolving transfer security policy");
    const policy = await (0, transfer_security_1.getTransferSecurityPolicy)();
    if (!policy.twoFactorAccepted) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Transfer 2FA verification is not required");
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Transfers on this platform are not confirmed with a one-time code.",
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
    if (enrolled.type === "APP") {
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Authenticator app code required (nothing to send)");
        return {
            type: "APP",
            delivered: false,
            message: "Enter the current code from your authenticator app",
        };
    }
    const secret = (0, utils_1.resolveTwoFactorSecret)(enrolled);
    const otp = (0, two_factor_code_1.generateTwoFactorCode)(secret, enrolled.type);
    const account = await db_1.models.user.findByPk(user.id);
    if (!account) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("User account not found");
        throw (0, error_1.createError)({ statusCode: 404, message: "User not found" });
    }
    if (enrolled.type === "EMAIL") {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Queueing transfer verification email");
        try {
            await emails_1.emailQueue.add({
                emailData: {
                    TO: account.email,
                    FIRSTNAME: account.firstName,
                    TOKEN: otp,
                },
                emailType: "OTPTokenVerification",
            });
        }
        catch (error) {
            console_1.logger.error("TRANSFER_2FA", "Failed to queue verification email", error);
            throw (0, error_1.createError)({
                statusCode: 500,
                message: "Could not send the verification code. Please try again.",
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Transfer verification code emailed");
        return {
            type: "EMAIL",
            delivered: true,
            message: "A verification code has been sent to your email",
        };
    }
    if (!account.phone) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("No phone number on file");
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "No phone number is on file for SMS verification. Update your profile or switch 2FA method.",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Sending transfer verification SMS");
    try {
        await (0, sms_1.sendSmsCode)(account.phone, otp, "TRANSFER_OTP");
    }
    catch (error) {
        console_1.logger.error("TRANSFER_2FA", "Failed to send verification SMS", error);
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Could not send the verification code. Please try again.",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Transfer verification code sent by SMS");
    return {
        type: "SMS",
        delivered: true,
        message: "A verification code has been sent to your phone",
    };
};
