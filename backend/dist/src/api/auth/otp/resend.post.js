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
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const error_1 = require("@b/utils/error");
const otplib_1 = require("otplib");
const emails_1 = require("@b/utils/emails");
const constants_1 = require("@b/utils/constants");
const utils_1 = require("./utils");
const cache_1 = require("@b/utils/cache");
exports.metadata = {
    summary: "Resends the OTP for 2FA",
    operationId: "resendOtp",
    tags: ["Auth"],
    description: "Resends the OTP for 2FA",
    requiresAuth: false,
    logModule: "2FA",
    logTitle: "Resend 2FA code",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        id: {
                            type: "string",
                            format: "uuid",
                            description: "ID of the user",
                        },
                        type: {
                            type: "string",
                            enum: ["EMAIL", "SMS"],
                            description: "Type of 2FA",
                        },
                    },
                    required: ["id", "type"],
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
    const { id, type } = body;
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating resend request");
        if (!id || !type) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("User ID and type are required");
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "User ID and type are required",
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Looking up user with 2FA");
        const user = await (0, utils_1.getUserWith2FA)(id);
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Generating new OTP");
        const otp = generateOtp(user.twoFactor.secret);
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
function generateOtp(secret) {
    otplib_1.authenticator.options = { window: 2 };
    return otplib_1.authenticator.generate(secret);
}
async function handleSmsResend(phoneNumber, otp) {
    const cacheManager = cache_1.CacheManager.getInstance();
    const smsTwoFactorEnabled = (await cacheManager.getSetting("twoFactorSmsStatus")) === "true";
    if (!smsTwoFactorEnabled ||
        !process.env.APP_TWILIO_VERIFY_SERVICE_SID) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "SMS 2FA is not enabled",
        });
    }
    const twilio = (await Promise.resolve().then(() => __importStar(require("twilio")))).default;
    try {
        const twilioClient = twilio(constants_1.APP_TWILIO_ACCOUNT_SID, constants_1.APP_TWILIO_AUTH_TOKEN);
        await twilioClient.messages.create({
            body: `Your OTP code is: ${otp}`,
            from: process.env.APP_TWILIO_PHONE_NUMBER,
            to: phoneNumber,
        });
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
    const emailTwoFactorEnabled = (await cacheManager.getSetting("twoFactorEmailStatus")) === "true";
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
