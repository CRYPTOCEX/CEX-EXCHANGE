"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const error_1 = require("@b/utils/error");
const token_1 = require("@b/utils/token");
const db_1 = require("@b/db");
const passwords_1 = require("@b/utils/passwords");
const utils_1 = require("../utils");
const cache_1 = require("@b/utils/cache");
const two_factor_code_1 = require("@b/utils/two-factor-code");
const emails_1 = require("@b/utils/emails");
const user_activity_1 = require("@b/utils/user-activity");
const utils_2 = require("@b/api/auth/otp/utils");
const sms_1 = require("@b/utils/sms");
const console_1 = require("@b/utils/console");
const system_accounts_1 = require("@b/utils/system-accounts");
exports.metadata = {
    summary: "Verifies a password reset token and sets the new password",
    operationId: "verifyPasswordReset",
    tags: ["Auth"],
    description: "Verifies a password reset token and sets the new password",
    requiresAuth: false,
    logModule: "PASSWORD",
    logTitle: "Password reset confirmation",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        token: {
                            type: "string",
                            description: "The password reset token",
                        },
                        newPassword: {
                            type: "string",
                            description: "The new password",
                        },
                    },
                    required: ["token", "newPassword"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "Password reset successfully. If 2FA is enabled, a challenge token is returned instead of session cookies and the OTP endpoint must be used to complete sign-in.",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: {
                                type: "string",
                                description: "Success message",
                            },
                            twoFactorToken: {
                                type: "string",
                                description: "Short-lived challenge token (only present when 2FA is required)",
                            },
                            twoFactor: {
                                type: "object",
                                properties: {
                                    enabled: { type: "boolean" },
                                    type: { type: "string" },
                                },
                            },
                            delivered: {
                                type: "boolean",
                                description: "True when a code was actually sent. False for authenticator apps (nothing to send) and when delivery failed.",
                            },
                            deliveryError: {
                                type: "string",
                                description: "Why the code could not be sent. Present only on a delivery failure; the challenge is still issued so a recovery code can be used.",
                            },
                            deliveryHint: {
                                type: "string",
                                description: "What the account holder can do when delivery failed.",
                            },
                            cookies: {
                                type: "object",
                                properties: {
                                    accessToken: { type: "string" },
                                    refreshToken: { type: "string" },
                                    sessionId: { type: "string" },
                                    csrfToken: { type: "string" },
                                },
                            },
                        },
                    },
                },
            },
        },
        400: {
            description: "Invalid request (e.g., missing token or newPassword)",
        },
        401: {
            description: "Unauthorized or invalid token",
        },
    },
};
exports.default = async (data) => {
    var _a;
    const { body, ctx } = data;
    const { token, newPassword } = body;
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating password reset token");
        if (!token || !newPassword) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Token and new password are required");
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Token and new password are required",
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Verifying reset token");
        const decodedToken = await (0, token_1.verifyResetToken)(token);
        if (!decodedToken) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Invalid or expired token");
            throw (0, error_1.createError)({
                statusCode: 401,
                message: "Invalid token",
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking token usage");
        try {
            if (decodedToken.jti !== (await (0, utils_1.addOneTimeToken)(decodedToken.jti, new Date()))) {
                ctx === null || ctx === void 0 ? void 0 : ctx.fail("Token already used");
                throw (0, error_1.createError)({
                    statusCode: 500,
                    message: "Token has already been used",
                });
            }
        }
        catch (error) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Token validation failed");
            throw (0, error_1.createError)({
                statusCode: 500,
                message: error.message,
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating password policy");
        if (!(0, passwords_1.validatePassword)(newPassword)) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Password does not meet requirements");
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Password must be at least 8 characters and include uppercase, lowercase, number, and special character.",
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Hashing new password");
        const errorOrHashedPassword = await (0, passwords_1.hashPassword)(newPassword);
        const hashedPassword = errorOrHashedPassword;
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Looking up user");
        const user = await db_1.models.user.findByPk(decodedToken.sub.user.id, {
            include: [{ model: db_1.models.twoFactor, as: "twoFactor" }],
        });
        if (!user) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("User not found");
            throw (0, error_1.createError)({
                statusCode: 404,
                message: "User not found",
            });
        }
        if ((0, system_accounts_1.isSystemAccount)(user)) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Reset token names a platform system account");
            throw (0, error_1.createError)({
                statusCode: 401,
                message: "Invalid token",
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating password");
        await user.update({ password: hashedPassword });
        void (0, user_activity_1.recordUserActivity)({
            userId: user.id,
            type: "security.password_reset",
            title: "Password reset",
            description: "Account password was reset via the reset-password flow.",
            severity: "warning",
            req: data,
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Revoking existing sessions");
        await (0, token_1.deleteAllUserSessions)(user.id);
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Disabling API keys");
        const [revokedKeys] = await db_1.models.apiKey.update({
            disabled: true,
            disabledAt: new Date(),
            disabledReason: "Password reset — all credentials revoked",
            disabledBy: "user",
        }, { where: { userId: user.id, disabled: false } });
        if (revokedKeys > 0) {
            ctx === null || ctx === void 0 ? void 0 : ctx.step(`Disabled ${revokedKeys} API key(s)`);
        }
        const cacheManager = cache_1.CacheManager.getInstance();
        const twoFactorGloballyEnabled = await cacheManager.getSettingBool("twoFactorStatus", true);
        const twoFactor = user.twoFactor;
        if (twoFactorGloballyEnabled && (twoFactor === null || twoFactor === void 0 ? void 0 : twoFactor.enabled)) {
            ctx === null || ctx === void 0 ? void 0 : ctx.step("2FA required to complete password reset");
            const type = twoFactor.type;
            if (type !== "SMS" && type !== "EMAIL" && type !== "APP") {
                throw (0, error_1.createError)({ statusCode: 400, message: "Invalid 2FA type" });
            }
            const code = (0, two_factor_code_1.generateTwoFactorCode)((0, utils_2.resolveTwoFactorSecret)(twoFactor), type);
            let delivered = true;
            let deliveryError;
            try {
                switch (type) {
                    case "SMS":
                        if (!user.phone) {
                            throw (0, error_1.createError)({
                                statusCode: 400,
                                message: "No phone number on file for SMS 2FA",
                            });
                        }
                        await sendSmsOtp(user.phone, code);
                        break;
                    case "EMAIL":
                        if (!user.email) {
                            throw (0, error_1.createError)({
                                statusCode: 400,
                                message: "No email on file for email 2FA",
                            });
                        }
                        await sendEmailOtp(user.email, (_a = user.firstName) !== null && _a !== void 0 ? _a : "", code);
                        break;
                    case "APP":
                        break;
                }
            }
            catch (error) {
                delivered = false;
                deliveryError =
                    (error === null || error === void 0 ? void 0 : error.message) ||
                        "The verification code could not be sent right now.";
                console_1.logger.error("AUTH", `2FA code delivery failed for ${user.email} (${type}) after a password reset: ${deliveryError}`);
                ctx === null || ctx === void 0 ? void 0 : ctx.step(`2FA code delivery failed: ${deliveryError}`, "warn");
            }
            const twoFactorToken = await (0, token_1.generateTwoFactorChallenge)(user.id);
            ctx === null || ctx === void 0 ? void 0 : ctx.success(`Password reset for ${user.email}; 2FA challenge issued`);
            return {
                twoFactor: { enabled: true, type },
                twoFactorToken,
                delivered: type === "APP" ? false : delivered,
                ...(deliveryError
                    ? {
                        deliveryError,
                        deliveryHint: "Enter a code from your authenticator app or use one of your recovery codes.",
                    }
                    : {}),
                message: "Password reset successfully. 2FA required to sign in.",
            };
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Generating session tokens");
        const result = await (0, utils_1.returnUserWithTokens)({
            user,
            message: "Password reset successfully",
            req: data,
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`Password reset successfully for user ${user.email}`);
        return result;
    }
    catch (error) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(error.message || "Password reset failed");
        throw error;
    }
};
async function sendSmsOtp(phoneNumber, otp) {
    const smsTwoFactorEnabled = (await cache_1.CacheManager.getInstance().getSettingBool("twoFactorSmsStatus", true)) || process.env.NEXT_PUBLIC_2FA_SMS_STATUS === "true";
    if (!smsTwoFactorEnabled || !(0, sms_1.isSmsAvailable)("AUTH_OTP")) {
        throw (0, error_1.createError)({ statusCode: 400, message: "SMS 2FA is not enabled" });
    }
    await (0, sms_1.sendSmsCode)(phoneNumber, otp, "AUTH_OTP");
}
async function sendEmailOtp(email, firstName, otp) {
    const emailTwoFactorEnabled = (await cache_1.CacheManager.getInstance().getSettingBool("twoFactorEmailStatus", true)) || process.env.NEXT_PUBLIC_2FA_EMAIL_STATUS === "true";
    if (!emailTwoFactorEnabled) {
        throw (0, error_1.createError)({ statusCode: 400, message: "Email 2FA is not enabled" });
    }
    await emails_1.emailQueue.add({
        emailData: { TO: email, FIRSTNAME: firstName, TOKEN: otp },
        emailType: "OTPTokenVerification",
    });
}
