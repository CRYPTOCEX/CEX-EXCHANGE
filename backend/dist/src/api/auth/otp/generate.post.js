"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const constants_1 = require("@b/utils/constants");
const sms_1 = require("@b/utils/sms");
const error_1 = require("@b/utils/error");
const db_1 = require("@b/db");
const console_1 = require("@b/utils/console");
const two_factor_code_1 = require("@b/utils/two-factor-code");
const qrcode_1 = __importDefault(require("qrcode"));
const emails_1 = require("@b/utils/emails");
const utils_1 = require("./utils");
const cache_1 = require("@b/utils/cache");
exports.metadata = {
    summary: "Generates an OTP secret",
    operationId: "generateOTPSecret",
    tags: ["Auth"],
    description: "Generates an OTP secret for the user",
    requiresAuth: true,
    logModule: "2FA",
    logTitle: "Generate 2FA secret",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        type: {
                            type: "string",
                            enum: ["EMAIL", "SMS", "APP"],
                            description: "Type of 2FA",
                        },
                        phoneNumber: {
                            type: "string",
                            description: "Phone number for SMS OTP",
                        },
                    },
                    required: ["type"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "OTP secret generated successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            secret: {
                                type: "string",
                                description: "Generated OTP secret",
                            },
                            qrCode: {
                                type: "string",
                                description: "QR code for APP OTP",
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
    const { body, user, ctx } = data;
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating user authentication");
        if (!user) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("User not authenticated");
            throw (0, error_1.createError)({ statusCode: 401, message: "unauthorized" });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Looking up user record");
        const userRecord = await (0, utils_1.getUserById)(user.id);
        const { type, phoneNumber, currentOtp } = body;
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating 2FA type");
        if (!type) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("2FA type is required");
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "2FA type is required",
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Generating OTP secret");
        const secret = (0, two_factor_code_1.generateTwoFactorSecret)();
        ctx === null || ctx === void 0 ? void 0 : ctx.step(`Setting up ${type} 2FA`);
        let result;
        switch (type) {
            case "SMS":
                result = await handleSms2FA(userRecord, secret, phoneNumber, ctx, currentOtp);
                break;
            case "APP":
                result = await handleApp2FA(userRecord, secret, ctx);
                break;
            case "EMAIL":
                result = await handleEmail2FA(userRecord, secret, ctx);
                break;
            default:
                ctx === null || ctx === void 0 ? void 0 : ctx.fail("Invalid 2FA type");
                throw (0, error_1.createError)({
                    statusCode: 400,
                    message: "Invalid type or 2FA method not enabled",
                });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`${type} 2FA generated successfully`);
        return result;
    }
    catch (error) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(error.message || "Failed to generate OTP");
        throw error;
    }
};
async function handleSms2FA(user, secret, phoneNumber, ctx, currentOtp) {
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking SMS 2FA availability");
    const cacheManager = cache_1.CacheManager.getInstance();
    const smsTwoFactorEnabled = await cacheManager.getSettingBool("twoFactorSmsStatus", true);
    if (!smsTwoFactorEnabled) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "SMS 2FA is not enabled",
        });
    }
    const smsConfigError = (0, sms_1.getSmsConfigError)("AUTH_OTP");
    if (smsConfigError) {
        throw (0, error_1.createError)({
            statusCode: 500,
            message: smsConfigError,
        });
    }
    if (!phoneNumber) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Phone number is required for SMS",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Saving phone number: ${phoneNumber}`);
    await (0, utils_1.assertPhoneChangeProof)(user.id, phoneNumber, currentOtp, ctx);
    try {
        await savePhoneQuery(user.id, phoneNumber);
    }
    catch (error) {
        throw (0, error_1.createError)({ statusCode: 500, message: error.message });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Generating and sending SMS OTP");
    const otp = (0, two_factor_code_1.generateTwoFactorCode)(secret, "SMS");
    try {
        await (0, sms_1.sendSmsCode)(phoneNumber, otp, "AUTH_OTP");
    }
    catch (error) {
        console_1.logger.error("AUTH", "Error sending SMS OTP", error);
        throw (0, error_1.createError)({ statusCode: 500, message: error.message });
    }
    return { secret };
}
async function handleApp2FA(user, secret, ctx) {
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking APP 2FA availability");
    const cacheManager = cache_1.CacheManager.getInstance();
    const appTwoFactorEnabled = await cacheManager.getSettingBool("twoFactorAppStatus", true);
    if (!appTwoFactorEnabled) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "App 2FA is not enabled",
        });
    }
    if (!user.email) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Email is required for APP OTP",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Generating QR code for authenticator app");
    const otpAuth = (0, two_factor_code_1.twoFactorKeyUri)(user.email, constants_1.appName, secret);
    const qrCode = await qrcode_1.default.toDataURL(otpAuth);
    return { secret, qrCode };
}
async function handleEmail2FA(user, secret, ctx) {
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking email 2FA availability");
    const cacheManager = cache_1.CacheManager.getInstance();
    const emailTwoFactorEnabled = await cacheManager.getSettingBool("twoFactorEmailStatus", true);
    if (!emailTwoFactorEnabled) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Email 2FA is not enabled",
        });
    }
    const email = user.email;
    const otp = (0, two_factor_code_1.generateTwoFactorCode)(secret, "EMAIL");
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Sending OTP to email: ${email}`);
    try {
        await emails_1.emailQueue.add({
            emailData: {
                TO: email,
                FIRSTNAME: user.firstName,
                TOKEN: otp,
            },
            emailType: "OTPTokenVerification",
        });
    }
    catch (error) {
        throw (0, error_1.createError)({ statusCode: 500, message: error.message });
    }
    return { secret };
}
async function savePhoneQuery(userId, phone) {
    return await db_1.models.user.update({ phone }, { where: { id: userId } });
}
