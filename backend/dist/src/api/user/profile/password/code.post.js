"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const error_1 = require("@b/utils/error");
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
const two_factor_code_1 = require("@b/utils/two-factor-code");
const emails_1 = require("@b/utils/emails");
const console_1 = require("@b/utils/console");
const cache_1 = require("@b/utils/cache");
const sms_1 = require("@b/utils/sms");
const utils_1 = require("@b/api/auth/otp/utils");
const utils_2 = require("./utils");
exports.metadata = {
    summary: "Sends a two-factor code for a password change",
    description: "Delivers a one-time code over the user's enrolled two-factor channel so an in-session password change can be confirmed. Authenticator-app users receive no message.",
    operationId: "sendPasswordChangeCode",
    tags: ["User", "Profile"],
    requiresAuth: true,
    middleware: ["passwordChangeCodeSend"],
    logModule: "PASSWORD",
    logTitle: "Send password-change code",
    responses: {
        200: {
            description: "Code issued",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            type: { type: "string" },
                            delivered: { type: "boolean" },
                            message: { type: "string" },
                        },
                    },
                },
            },
        },
        400: { description: "The enrolled channel cannot deliver a code" },
        401: query_1.unauthorizedResponse,
        403: { description: "Caller is not an interactive session, or 2FA is not enabled" },
        404: (0, query_1.notFoundMetadataResponse)("User"),
        500: query_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    const { user, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("User not authenticated");
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    (0, utils_2.assertSessionCaller)(data);
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Loading enrolled two-factor method");
    const twoFactor = await db_1.models.twoFactor.findOne({
        where: { userId: user.id },
    });
    const settings = await cache_1.CacheManager.getInstance().getSettings();
    const twoFactorGloballyEnabled = cache_1.CacheManager.toBool(settings.get("twoFactorStatus"), true);
    if (!twoFactorGloballyEnabled || !(twoFactor === null || twoFactor === void 0 ? void 0 : twoFactor.enabled)) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Two-factor authentication is not enabled");
        throw (0, error_1.createError)({
            statusCode: 403,
            message: "Two-factor authentication is not enabled on this account, so no code is needed.",
        });
    }
    if (twoFactor.type === "APP") {
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Authenticator app code required (nothing to send)");
        return {
            type: "APP",
            delivered: false,
            message: "Enter the current code from your authenticator app",
        };
    }
    const account = await db_1.models.user.findByPk(user.id);
    if (!account) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("User account not found");
        throw (0, error_1.createError)({ statusCode: 404, message: "User not found" });
    }
    const secret = (0, utils_1.resolveTwoFactorSecret)(twoFactor);
    const otp = (0, two_factor_code_1.generateTwoFactorCode)(secret, twoFactor.type);
    if (twoFactor.type === "EMAIL") {
        const emailAvailable = cache_1.CacheManager.toBool(settings.get("twoFactorEmailStatus"), true) ||
            process.env.NEXT_PUBLIC_2FA_EMAIL_STATUS === "true";
        if (!emailAvailable) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Email 2FA is not enabled platform-wide");
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Email two-factor delivery is not enabled on this platform. Use one of your recovery codes instead.",
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Queueing password-change verification email");
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
            console_1.logger.error("PASSWORD", "Failed to queue verification email", error);
            throw (0, error_1.createError)({
                statusCode: 500,
                message: "Could not send the verification code. Please try again.",
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Password-change code emailed");
        return {
            type: "EMAIL",
            delivered: true,
            message: "A verification code has been sent to your email",
        };
    }
    const smsAvailable = (cache_1.CacheManager.toBool(settings.get("twoFactorSmsStatus"), true) ||
        process.env.NEXT_PUBLIC_2FA_SMS_STATUS === "true") &&
        (0, sms_1.isSmsAvailable)("PASSWORD_CHANGE_OTP");
    if (!smsAvailable) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("SMS 2FA is not available");
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "SMS two-factor delivery is not available on this platform. Use one of your recovery codes instead.",
        });
    }
    if (!account.phone) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("No phone number on file");
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "No phone number is on file for SMS verification. Update your profile or switch 2FA method.",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Sending password-change verification SMS");
    try {
        await (0, sms_1.sendSmsCode)(account.phone, otp, "PASSWORD_CHANGE_OTP");
    }
    catch (error) {
        console_1.logger.error("PASSWORD", "Failed to send verification SMS", error);
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Could not send the verification code. Please try again.",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Password-change code sent by SMS");
    return {
        type: "SMS",
        delivered: true,
        message: "A verification code has been sent to your phone",
    };
};
