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
exports.savePhoneQuery = savePhoneQuery;
const error_1 = require("@b/utils/error");
const db_1 = require("@b/db");
const otplib_1 = require("otplib");
const qrcode_1 = __importDefault(require("qrcode"));
const query_1 = require("@b/utils/query");
const cache_1 = require("@b/utils/cache");
const APP_TWILIO_ACCOUNT_SID = process.env.APP_TWILIO_ACCOUNT_SID;
const APP_TWILIO_AUTH_TOKEN = process.env.APP_TWILIO_AUTH_TOKEN;
const APP_TWILIO_PHONE_NUMBER = process.env.APP_TWILIO_PHONE_NUMBER;
const NEXT_PUBLIC_SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME;
exports.metadata = {
    summary: "Generates an OTP secret and sends OTP via SMS or generates a QR code for OTP APP",
    description: "Generates an OTP secret and sends OTP via SMS or generates a QR code for OTP APP",
    operationId: "generateOTPSecret",
    tags: ["Profile"],
    requiresAuth: true,
    logModule: "USER",
    logTitle: "Generate OTP secret",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        type: {
                            type: "string",
                            description: "Type of OTP to generate",
                            enum: ["EMAIL", "SMS", "APP"],
                        },
                        phoneNumber: {
                            type: "string",
                            description: "Phone number to send the OTP to",
                        },
                        email: {
                            type: "string",
                            description: "Email to generate the QR code for OTP APP",
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
                            status: {
                                type: "boolean",
                                description: "Indicates if the request was successful",
                            },
                            statusCode: {
                                type: "number",
                                description: "HTTP status code",
                                example: 200,
                            },
                            data: {
                                type: "object",
                                properties: {
                                    secret: {
                                        type: "string",
                                        description: "OTP secret",
                                    },
                                    qrCode: {
                                        type: "string",
                                        description: "QR code for OTP APP",
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("User"),
        500: query_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    const { user, body, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("User not authenticated");
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const { type, phoneNumber, email } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Generating OTP secret");
    const secret = otplib_1.authenticator.generateSecret();
    try {
        const cacheManager = cache_1.CacheManager.getInstance();
        if (type === "SMS") {
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating SMS 2FA configuration");
            const smsTwoFactorEnabled = (await cacheManager.getSetting("twoFactorSmsStatus")) === "true";
            if (!smsTwoFactorEnabled) {
                ctx === null || ctx === void 0 ? void 0 : ctx.fail("SMS 2FA not enabled");
                throw (0, error_1.createError)({
                    statusCode: 400,
                    message: "SMS 2FA is not enabled on this server",
                });
            }
            if (!APP_TWILIO_ACCOUNT_SID || !APP_TWILIO_AUTH_TOKEN || !APP_TWILIO_PHONE_NUMBER) {
                ctx === null || ctx === void 0 ? void 0 : ctx.fail("SMS service not configured");
                throw (0, error_1.createError)({
                    statusCode: 500,
                    message: "SMS service is not properly configured",
                });
            }
            if (!phoneNumber) {
                ctx === null || ctx === void 0 ? void 0 : ctx.fail("Phone number missing");
                throw (0, error_1.createError)({
                    statusCode: 400,
                    message: "Phone number is required for SMS type",
                });
            }
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Saving phone number");
            await savePhoneQuery(user.id, phoneNumber);
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Sending OTP via SMS");
            const otp = otplib_1.authenticator.generate(secret);
            const twilio = (await Promise.resolve().then(() => __importStar(require("twilio")))).default(APP_TWILIO_ACCOUNT_SID, APP_TWILIO_AUTH_TOKEN);
            await twilio.messages.create({
                body: `Your OTP is: ${otp}`,
                from: APP_TWILIO_PHONE_NUMBER,
                to: phoneNumber,
            });
            ctx === null || ctx === void 0 ? void 0 : ctx.success("OTP sent via SMS successfully");
            return { secret };
        }
        else if (type === "APP") {
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating APP 2FA configuration");
            const appTwoFactorEnabled = (await cacheManager.getSetting("twoFactorAppStatus")) === "true";
            if (!appTwoFactorEnabled) {
                ctx === null || ctx === void 0 ? void 0 : ctx.fail("APP 2FA not enabled");
                throw (0, error_1.createError)({
                    statusCode: 400,
                    message: "Authenticator app 2FA is not enabled on this server",
                });
            }
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Generating QR code");
            const otpAuth = otplib_1.authenticator.keyuri(email || user.email || "", NEXT_PUBLIC_SITE_NAME || "", secret);
            const qrCode = await qrcode_1.default.toDataURL(otpAuth);
            ctx === null || ctx === void 0 ? void 0 : ctx.success("QR code generated successfully");
            return { secret, qrCode };
        }
        else if (type === "EMAIL") {
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating EMAIL 2FA configuration");
            const emailTwoFactorEnabled = (await cacheManager.getSetting("twoFactorEmailStatus")) === "true";
            if (!emailTwoFactorEnabled) {
                ctx === null || ctx === void 0 ? void 0 : ctx.fail("EMAIL 2FA not enabled");
                throw (0, error_1.createError)({
                    statusCode: 400,
                    message: "Email 2FA is not enabled on this server",
                });
            }
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Generating QR code");
            const otpAuth = otplib_1.authenticator.keyuri(email || user.email || "", NEXT_PUBLIC_SITE_NAME || "", secret);
            const qrCode = await qrcode_1.default.toDataURL(otpAuth);
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Sending OTP via email");
            const otp = otplib_1.authenticator.generate(secret);
            const { emailQueue } = await Promise.resolve().then(() => __importStar(require("@b/utils/emails")));
            await emailQueue.add({
                emailData: {
                    TO: user.email,
                    FIRSTNAME: user.firstName,
                    TOKEN: otp,
                },
                emailType: "OTPTokenVerification",
            });
            ctx === null || ctx === void 0 ? void 0 : ctx.success("OTP sent via email successfully");
            return { secret, qrCode };
        }
        else {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Invalid OTP type");
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Invalid type. Must be EMAIL, SMS, or APP",
            });
        }
    }
    catch (error) {
        if (error.statusCode)
            throw error;
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Error generating OTP: ${error.message}`);
        throw (0, error_1.createError)({ statusCode: 500, message: error.message });
    }
};
async function savePhoneQuery(userId, phone) {
    await db_1.models.user.update({
        phone: phone,
    }, {
        where: { id: userId },
    });
    const response = await db_1.models.user.findOne({
        where: { id: userId },
    });
    if (!response) {
        throw (0, error_1.createError)({
            statusCode: 404,
            message: "User not found",
        });
    }
    return response.get({ plain: true });
}
