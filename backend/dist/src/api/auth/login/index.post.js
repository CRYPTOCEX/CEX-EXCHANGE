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
const constants_1 = require("@b/utils/constants");
const error_1 = require("@b/utils/error");
const passwords_1 = require("@b/utils/passwords");
const db_1 = require("@b/db");
const date_fns_1 = require("date-fns");
const otplib_1 = require("otplib");
const utils_1 = require("../utils");
const emails_1 = require("@b/utils/emails");
const cache_1 = require("@b/utils/cache");
const pow_captcha_1 = require("@b/utils/pow-captcha");
exports.metadata = {
    summary: "Logs in a user",
    description: "Logs in a user and returns a session token",
    operationId: "loginUser",
    tags: ["Auth"],
    requiresAuth: false,
    logModule: "LOGIN",
    logTitle: "User login",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        email: {
                            type: "string",
                            format: "email",
                            description: "Email of the user",
                        },
                        password: {
                            type: "string",
                            description: "Password of the user",
                        },
                        powSolution: {
                            type: "object",
                            description: "Proof-of-work solution if enabled",
                            nullable: true,
                            properties: {
                                challenge: { type: "string" },
                                nonce: { type: "number" },
                                hash: { type: "string" },
                            },
                        },
                    },
                    required: ["email", "password"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "User logged in successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: {
                                type: "string",
                                description: "Success message",
                            },
                            twoFactor: {
                                type: "object",
                                properties: {
                                    enabled: {
                                        type: "boolean",
                                        description: "2FA enabled status",
                                    },
                                    type: {
                                        type: "string",
                                        description: "Type of 2FA",
                                    },
                                },
                            },
                            id: {
                                type: "string",
                                description: "User ID",
                            },
                        },
                    },
                },
            },
        },
        400: {
            description: "Invalid request (e.g., invalid email or password)",
        },
        401: {
            description: "Unauthorized (e.g., incorrect email or password)",
        },
    },
};
exports.default = async (data) => {
    const { body, ctx } = data;
    const { email, password, powSolution } = body;
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating credentials format");
        if (!email || !password) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Missing email or password");
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Email and password are required",
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Verifying security challenge");
        try {
            await (0, pow_captcha_1.verifyPowOrThrow)(powSolution, "login");
        }
        catch (powError) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Security verification failed");
            throw (0, error_1.createError)({
                statusCode: 400,
                message: powError instanceof Error ? powError.message : "Security verification failed",
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step(`Looking up user: ${email}`);
        const user = await findUserWith2FA(email);
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking email verification status");
        await handleEmailVerificationIfRequired(user);
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Verifying password");
        await verifyPasswordOrThrow(user, password);
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating login attempts");
        await handleLoginAttempts(user);
        if (await isTwoFactorAuthenticationRequired(user)) {
            ctx === null || ctx === void 0 ? void 0 : ctx.step("2FA required, sending verification code", "warn");
            return await handleTwoFactorAuthentication(user, ctx);
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Generating session tokens");
        const result = await (0, utils_1.returnUserWithTokens)({
            user,
            message: "You have been logged in successfully",
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`User ${email} logged in successfully`);
        return result;
    }
    catch (error) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(error.message || "Login failed");
        throw (0, error_1.createError)({
            statusCode: error.statusCode || 500,
            message: error.message || "An unexpected error occurred",
        });
    }
};
async function findUserWith2FA(email) {
    const user = await db_1.models.user.findOne({
        where: { email },
        include: {
            model: db_1.models.twoFactor,
            as: "twoFactor",
        },
    });
    if (!user || !user.password) {
        throw (0, error_1.createError)({
            statusCode: 401,
            message: "Incorrect email or password",
        });
    }
    if (user.status === "BANNED") {
        throw (0, error_1.createError)({
            statusCode: 403,
            message: "Your account has been banned. Please contact support.",
        });
    }
    if (user.status === "SUSPENDED") {
        throw (0, error_1.createError)({
            statusCode: 403,
            message: "Your account is suspended. Please contact support.",
        });
    }
    if (user.status === "INACTIVE") {
        throw (0, error_1.createError)({
            statusCode: 403,
            message: "Your account is inactive. Please verify your email or contact support.",
        });
    }
    return user;
}
async function handleEmailVerificationIfRequired(user) {
    const cacheManager = cache_1.CacheManager.getInstance();
    const verifyEmailStatus = await cacheManager.getSetting("verifyEmailStatus");
    if (verifyEmailStatus === "true" &&
        !user.emailVerified &&
        user.email) {
        await (0, utils_1.sendEmailVerificationToken)(user.id, user.email);
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "User email not verified. Verification email sent.",
        });
    }
}
async function verifyPasswordOrThrow(user, password) {
    var _a;
    const isPasswordValid = await (0, passwords_1.verifyPassword)(user.password, password);
    if (!isPasswordValid) {
        await db_1.models.user.update({
            failedLoginAttempts: ((_a = user.failedLoginAttempts) !== null && _a !== void 0 ? _a : 0) + 1,
            lastFailedLogin: new Date(),
        }, { where: { email: user.email } });
        throw (0, error_1.createError)({
            statusCode: 401,
            message: "Incorrect email or password",
        });
    }
}
async function handleLoginAttempts(user) {
    var _a, _b;
    const blockedUntil = (0, date_fns_1.addMinutes)((_a = user.lastFailedLogin) !== null && _a !== void 0 ? _a : 0, 5);
    if (((_b = user.failedLoginAttempts) !== null && _b !== void 0 ? _b : 0) >= 5 && blockedUntil > new Date()) {
        throw (0, error_1.createError)({
            statusCode: 403,
            message: "Too many failed login attempts, account is temporarily blocked",
        });
    }
    await db_1.models.user.update({
        failedLoginAttempts: 0,
        lastFailedLogin: null,
        lastLogin: new Date(),
    }, { where: { email: user.email } });
}
async function isTwoFactorAuthenticationRequired(user) {
    var _a;
    const cacheManager = cache_1.CacheManager.getInstance();
    const twoFactorEnabled = (await cacheManager.getSetting("twoFactorStatus")) === "true";
    return (((_a = user.twoFactor) === null || _a === void 0 ? void 0 : _a.enabled) && twoFactorEnabled);
}
async function handleTwoFactorAuthentication(user, ctx) {
    var _a;
    const type = (_a = user.twoFactor) === null || _a === void 0 ? void 0 : _a.type;
    otplib_1.authenticator.options = { window: 2 };
    const otp = otplib_1.authenticator.generate(user.twoFactor.secret);
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Generating 2FA code for type: ${type}`);
    switch (type) {
        case "SMS":
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Sending SMS OTP");
            await sendSmsOtp(user.phone, otp);
            break;
        case "EMAIL":
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Sending email OTP");
            await sendEmailOtp(user.email, user.firstName, otp);
            break;
        case "APP":
            ctx === null || ctx === void 0 ? void 0 : ctx.step("APP OTP ready for verification");
            break;
        default:
            throw (0, error_1.createError)({ statusCode: 400, message: "Invalid 2FA type" });
    }
    return {
        twoFactor: {
            enabled: true,
            type,
        },
        id: user.id,
        message: "2FA required",
    };
}
async function sendSmsOtp(phoneNumber, otp) {
    if (process.env.NEXT_PUBLIC_2FA_SMS_STATUS !== "true" ||
        !process.env.APP_TWILIO_VERIFY_SERVICE_SID) {
        throw (0, error_1.createError)({ statusCode: 400, message: "SMS 2FA is not enabled" });
    }
    const twilio = (await Promise.resolve().then(() => __importStar(require("twilio")))).default;
    const twilioClient = twilio(constants_1.APP_TWILIO_ACCOUNT_SID, constants_1.APP_TWILIO_AUTH_TOKEN);
    await twilioClient.messages.create({
        body: `Your OTP code is: ${otp}`,
        from: process.env.APP_TWILIO_PHONE_NUMBER,
        to: phoneNumber,
    });
}
async function sendEmailOtp(email, firstName, otp) {
    if (process.env.NEXT_PUBLIC_2FA_EMAIL_STATUS !== "true") {
        throw (0, error_1.createError)({ statusCode: 400, message: "Email 2FA is not enabled" });
    }
    await emails_1.emailQueue.add({
        emailData: {
            TO: email,
            FIRSTNAME: firstName,
            TOKEN: otp,
        },
        emailType: "OTPTokenVerification",
    });
}
