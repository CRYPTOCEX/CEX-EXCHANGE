"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const constants_1 = require("@b/utils/constants");
const error_1 = require("@b/utils/error");
const db_1 = require("@b/db");
const console_1 = require("@b/utils/console");
const otplib_1 = require("otplib");
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
        const { type, phoneNumber } = body;
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating 2FA type");
        if (!type) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("2FA type is required");
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "2FA type is required",
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Generating OTP secret");
        otplib_1.authenticator.options = { window: 2 };
        const secret = otplib_1.authenticator.generateSecret();
        ctx === null || ctx === void 0 ? void 0 : ctx.step(`Setting up ${type} 2FA`);
        let result;
        switch (type) {
            case "SMS":
                result = await handleSms2FA(userRecord, secret, phoneNumber, ctx);
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
async function handleSms2FA(user, secret, phoneNumber, ctx) {
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking SMS 2FA availability");
    const cacheManager = cache_1.CacheManager.getInstance();
    const smsTwoFactorEnabled = (await cacheManager.getSetting("twoFactorSmsStatus")) === "true";
    if (!smsTwoFactorEnabled) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "SMS 2FA is not enabled",
        });
    }
    if (!process.env.APP_TWILIO_VERIFY_SERVICE_SID) {
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Service SID is not set",
        });
    }
    if (!phoneNumber) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Phone number is required for SMS",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Saving phone number: ${phoneNumber}`);
    try {
        await savePhoneQuery(user.id, phoneNumber);
    }
    catch (error) {
        throw (0, error_1.createError)({ statusCode: 500, message: error.message });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Generating and sending SMS OTP");
    const otp = otplib_1.authenticator.generate(secret);
    try {
        const twilio = (await Promise.resolve().then(() => __importStar(require("twilio")))).default;
        const twilioClient = twilio(constants_1.APP_TWILIO_ACCOUNT_SID, constants_1.APP_TWILIO_AUTH_TOKEN);
        await twilioClient.messages.create({
            body: `Your OTP code is: ${otp}`,
            from: process.env.APP_TWILIO_PHONE_NUMBER,
            to: phoneNumber,
        });
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
    const appTwoFactorEnabled = (await cacheManager.getSetting("twoFactorAppStatus")) === "true";
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
    const otpAuth = otplib_1.authenticator.keyuri(user.email, constants_1.appName, secret);
    const qrCode = await qrcode_1.default.toDataURL(otpAuth);
    return { secret, qrCode };
}
async function handleEmail2FA(user, secret, ctx) {
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking email 2FA availability");
    const cacheManager = cache_1.CacheManager.getInstance();
    const emailTwoFactorEnabled = (await cacheManager.getSetting("twoFactorEmailStatus")) === "true";
    if (!emailTwoFactorEnabled) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Email 2FA is not enabled",
        });
    }
    const email = user.email;
    const otp = otplib_1.authenticator.generate(secret);
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
