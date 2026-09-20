"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const error_1 = require("@b/utils/error");
const two_factor_code_1 = require("@b/utils/two-factor-code");
const emails_1 = require("@b/utils/emails");
const sms_1 = require("@b/utils/sms");
const utils_1 = require("./utils");
const cache_1 = require("@b/utils/cache");
const token_1 = require("@b/utils/token");
exports.metadata = {
    summary: "Resends the OTP for 2FA",
    operationId: "resendOtp",
    tags: ["Auth"],
    description: "Resends the OTP for 2FA. Requires the short-lived challenge token issued by the login endpoint, which is what binds the request to a login attempt in progress.",
    requiresAuth: false,
    middleware: ["twoFactorCodeSend"],
    logModule: "2FA",
    logTitle: "Resend 2FA code",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        twoFactorToken: {
                            type: "string",
                            description: "Short-lived challenge token returned from the login endpoint",
                        },
                        type: {
                            type: "string",
                            enum: ["EMAIL", "SMS"],
                            description: "Type of 2FA",
                        },
                    },
                    required: ["twoFactorToken", "type"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "OTP resent successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: {
                                type: "string",
                                description: "Success message",
                            },
                        },
                    },
                },
            },
        },
        400: {
            description: "Invalid request",
        },
        401: {
            description: "Unauthorized",
        },
    },
};
exports.default = async (data) => {
    const { body, ctx } = data;
    const { twoFactorToken, type } = body;
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating resend request");
        if (!type) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("2FA type is required");
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "2FA type is required",
            });
        }
        if (!twoFactorToken) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Missing 2FA challenge token");
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "A 2FA challenge token is required. Please start the login again.",
            });
        }
        const userId = await (0, token_1.verifyTwoFactorChallenge)(twoFactorToken);
        if (!userId) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Invalid or expired 2FA challenge");
            throw (0, error_1.createError)({
                statusCode: 401,
                message: "Invalid or expired 2FA challenge. Please log in again.",
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Looking up user with 2FA");
        const user = await (0, utils_1.getUserWith2FA)(userId);
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Generating new OTP");
        const otp = (0, two_factor_code_1.generateTwoFactorCode)((0, utils_1.resolveTwoFactorSecret)(user.twoFactor), user.twoFactor.type);
        ctx === null || ctx === void 0 ? void 0 : ctx.step(`Resending OTP via ${type}`);
        if (type === "SMS") {
            await handleSmsResend(user.phone || "", otp);
        }
        else if (type === "EMAIL") {
            await handleEmailResend(user.email || "", user.firstName || "", otp);
        }
        else {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Invalid 2FA type");
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Invalid 2FA type or 2FA method not enabled",
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`OTP resent successfully via ${type}`);
        return {
            message: "OTP resent successfully",
        };
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to resend OTP";
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(errorMessage);
        throw error;
    }
};
async function handleSmsResend(phoneNumber, otp) {
    const cacheManager = cache_1.CacheManager.getInstance();
    const smsTwoFactorEnabled = await cacheManager.getSettingBool("twoFactorSmsStatus", true);
    if (!smsTwoFactorEnabled || !(0, sms_1.isSmsAvailable)("AUTH_OTP")) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "SMS 2FA is not enabled",
        });
    }
    try {
        await (0, sms_1.sendSmsCode)(phoneNumber, otp, "AUTH_OTP");
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        throw (0, error_1.createError)({
            statusCode: 500,
            message: `Error sending SMS: ${errorMessage}`,
        });
    }
}
async function handleEmailResend(email, firstName, otp) {
    const cacheManager = cache_1.CacheManager.getInstance();
    const emailTwoFactorEnabled = await cacheManager.getSettingBool("twoFactorEmailStatus", true);
    if (!emailTwoFactorEnabled) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Email 2FA is not enabled",
        });
    }
    try {
        await emails_1.emailQueue.add({
            emailData: {
                TO: email,
                FIRSTNAME: firstName,
                TOKEN: otp,
            },
            emailType: "OTPTokenVerification",
        });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        throw (0, error_1.createError)({
            statusCode: 500,
            message: `Error sending email: ${errorMessage}`,
        });
    }
}
