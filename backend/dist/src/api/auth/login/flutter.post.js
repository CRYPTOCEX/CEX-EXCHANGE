"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const error_1 = require("@b/utils/error");
const sms_1 = require("@b/utils/sms");
const passwords_1 = require("@b/utils/passwords");
const db_1 = require("@b/db");
const date_fns_1 = require("date-fns");
const two_factor_code_1 = require("@b/utils/two-factor-code");
const utils_1 = require("../utils");
const emails_1 = require("@b/utils/emails");
const cache_1 = require("@b/utils/cache");
const token_1 = require("@b/utils/token");
const user_activity_1 = require("@b/utils/user-activity");
const utils_2 = require("@b/api/auth/otp/utils");
const rate_limiter_1 = require("@b/handler/utils/rate-limiter");
const console_1 = require("@b/utils/console");
const system_accounts_1 = require("@b/utils/system-accounts");
exports.metadata = {
    summary: "Logs in a user",
    description: "Logs in a user and returns a session token",
    operationId: "loginUser",
    tags: ["Auth"],
    requiresAuth: false,
    logModule: "LOGIN",
    logTitle: "Flutter app login",
    middleware: ["loginAttempt", "emailVerificationSend"],
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
                            twoFactorToken: {
                                type: "string",
                                description: "Short-lived token that must be returned with the OTP to complete login",
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
    const { email, password } = body;
    let verificationEmailQueued = false;
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating login credentials");
        if (!email || !password) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Email and password are required");
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Email and password are required",
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step(`Looking up user: ${email}`);
        const user = await findUserByEmail(email);
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking login attempts");
        enforceLoginLockout(user);
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Verifying password");
        try {
            await validatePassword(user, password);
        }
        catch (passwordErr) {
            void (0, user_activity_1.recordUserActivity)({
                userId: user.id,
                type: "auth.login_failed",
                title: "Failed sign-in attempt",
                description: "Incorrect password (mobile)",
                severity: "warning",
                req: data,
            });
            throw passwordErr;
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking email verification status");
        if (await handleEmailVerification(user)) {
            verificationEmailQueued = true;
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "User email not verified. Verification email sent.",
            });
        }
        if (await isTwoFactorRequired(user)) {
            ctx === null || ctx === void 0 ? void 0 : ctx.step("2FA required, sending verification code", "warn");
            return await handleTwoFactorAuthentication(user);
        }
        await resetFailedLoginAttempts(user);
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Generating session tokens");
        const result = await (0, utils_1.returnUserWithTokens)({
            user,
            message: "You have been logged in successfully",
            req: data,
        });
        void (0, user_activity_1.recordUserActivity)({
            userId: user.id,
            type: "auth.login",
            title: "Signed in",
            description: "Mobile app",
            severity: "info",
            req: data,
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`User ${email} logged in successfully (Flutter)`);
        return result;
    }
    catch (error) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(error.message || "Login failed");
        throw error;
    }
    finally {
        if (!verificationEmailQueued) {
            await (0, rate_limiter_1.refundRateLimit)(data, "email_verify_send");
        }
    }
};
async function findUserByEmail(email) {
    const user = await db_1.models.user.findOne({
        where: { email },
        include: {
            model: db_1.models.twoFactor,
            as: "twoFactor",
        },
    });
    if (!user || !user.password || (0, system_accounts_1.isSystemAccount)(user)) {
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
async function handleEmailVerification(user) {
    const cacheManager = cache_1.CacheManager.getInstance();
    const verifyEmailStatus = await cacheManager.getSettingBool("verifyEmailStatus", true);
    if (verifyEmailStatus &&
        !user.emailVerified &&
        user.email) {
        await (0, utils_1.sendEmailVerificationToken)(user.id, user.email);
        return true;
    }
    return false;
}
async function validatePassword(user, password) {
    const isPasswordValid = await (0, passwords_1.verifyPassword)(user.password, password);
    if (!isPasswordValid) {
        await incrementFailedLoginAttempts(user);
        throw (0, error_1.createError)({
            statusCode: 401,
            message: "Incorrect email or password",
        });
    }
}
async function incrementFailedLoginAttempts(user) {
    var _a;
    await db_1.models.user.update({
        failedLoginAttempts: ((_a = user.failedLoginAttempts) !== null && _a !== void 0 ? _a : 0) + 1,
        lastFailedLogin: new Date(),
    }, { where: { email: user.email } });
}
function enforceLoginLockout(user) {
    var _a, _b;
    const blockedUntil = (0, date_fns_1.addMinutes)((_a = user.lastFailedLogin) !== null && _a !== void 0 ? _a : 0, 5);
    if (((_b = user.failedLoginAttempts) !== null && _b !== void 0 ? _b : 0) >= 5 && blockedUntil > new Date()) {
        throw (0, error_1.createError)({
            statusCode: 403,
            message: "Too many failed login attempts, account temporarily blocked",
        });
    }
}
async function resetFailedLoginAttempts(user) {
    await db_1.models.user.update({
        failedLoginAttempts: 0,
        lastFailedLogin: null,
    }, { where: { email: user.email } });
}
async function isTwoFactorRequired(user) {
    var _a;
    const cacheManager = cache_1.CacheManager.getInstance();
    const twoFactorEnabled = await cacheManager.getSettingBool("twoFactorStatus", true);
    return (((_a = user.twoFactor) === null || _a === void 0 ? void 0 : _a.enabled) && twoFactorEnabled);
}
async function handleTwoFactorAuthentication(user) {
    var _a;
    const type = (_a = user.twoFactor) === null || _a === void 0 ? void 0 : _a.type;
    if (type !== "SMS" && type !== "EMAIL" && type !== "APP") {
        throw (0, error_1.createError)({ statusCode: 400, message: "Invalid 2FA type" });
    }
    const otp = (0, two_factor_code_1.generateTwoFactorCode)((0, utils_2.resolveTwoFactorSecret)(user.twoFactor), type);
    let delivered = true;
    let deliveryError;
    try {
        switch (type) {
            case "SMS":
                await sendSmsOtp(user.phone, otp);
                break;
            case "EMAIL":
                await sendEmailOtp(user.email, user.firstName, otp);
                break;
            case "APP":
                break;
        }
    }
    catch (error) {
        delivered = false;
        deliveryError =
            (error === null || error === void 0 ? void 0 : error.message) || "The verification code could not be sent right now.";
        console_1.logger.error("AUTH", `2FA code delivery failed for ${user.email} (${type}, mobile): ${deliveryError}`);
    }
    const twoFactorToken = await (0, token_1.generateTwoFactorChallenge)(user.id);
    return {
        twoFactor: {
            enabled: true,
            type,
        },
        twoFactorToken,
        delivered: type === "APP" ? false : delivered,
        ...(deliveryError
            ? {
                deliveryError,
                deliveryHint: "Enter a code from your authenticator app or use one of your recovery codes.",
            }
            : {}),
        message: "2FA required",
    };
}
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
        emailData: {
            TO: email,
            FIRSTNAME: firstName,
            TOKEN: otp,
        },
        emailType: "OTPTokenVerification",
    });
}
