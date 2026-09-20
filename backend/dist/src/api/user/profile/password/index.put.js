"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const error_1 = require("@b/utils/error");
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
const cache_1 = require("@b/utils/cache");
const console_1 = require("@b/utils/console");
const redis_1 = require("@b/utils/redis");
const passwords_1 = require("@b/utils/passwords");
const token_1 = require("@b/utils/token");
const user_activity_1 = require("@b/utils/user-activity");
const utils_1 = require("@b/api/auth/otp/utils");
const utils_2 = require("./utils");
const MAX_ATTEMPTS = 5;
const ATTEMPT_WINDOW_SECONDS = 900;
const OTP_MAX_ATTEMPTS = 5;
const OTP_ATTEMPT_WINDOW_SECONDS = 600;
const MAX_PASSWORD_LENGTH = 128;
const POLICY_MESSAGE = "Password must be at least 8 characters and include an uppercase letter, a lowercase letter, a number, and a special character";
exports.metadata = {
    summary: "Changes the password of the current user",
    description: "Verifies the caller's current password (and second factor, when enrolled), sets a new one, and signs out every other device while keeping this session active.",
    operationId: "changeOwnPassword",
    tags: ["User", "Profile"],
    requiresAuth: true,
    middleware: ["passwordChange"],
    logModule: "PASSWORD",
    logTitle: "Change password",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        currentPassword: {
                            type: "string",
                            description: "The account's existing password",
                        },
                        newPassword: {
                            type: "string",
                            description: "The replacement password",
                        },
                        confirmPassword: {
                            type: "string",
                            description: "Repeat of the replacement password",
                            nullable: true,
                        },
                        twoFactorCode: {
                            type: "string",
                            description: "One-time code, or a recovery code, required when two-factor authentication is enabled",
                            nullable: true,
                        },
                    },
                    required: ["currentPassword", "newPassword"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "Password changed",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: { type: "string" },
                            revokedSessions: { type: "number" },
                        },
                    },
                },
            },
        },
        400: { description: "Invalid request, wrong current password, or policy failure" },
        401: query_1.unauthorizedResponse,
        403: { description: "Caller is not an interactive session" },
        404: (0, query_1.notFoundMetadataResponse)("User"),
        409: { description: "Account has no password to change" },
        429: { description: "Too many attempts" },
        500: query_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    const { user, body, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("User not authenticated");
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    (0, utils_2.assertSessionCaller)(data);
    const currentPassword = typeof (body === null || body === void 0 ? void 0 : body.currentPassword) === "string" ? body.currentPassword : "";
    const newPassword = typeof (body === null || body === void 0 ? void 0 : body.newPassword) === "string" ? body.newPassword : "";
    const confirmPassword = typeof (body === null || body === void 0 ? void 0 : body.confirmPassword) === "string" ? body.confirmPassword : undefined;
    const twoFactorCode = typeof (body === null || body === void 0 ? void 0 : body.twoFactorCode) === "string" ? body.twoFactorCode.trim() : "";
    if (!currentPassword || !newPassword) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Missing password fields");
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Both your current password and a new password are required.",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Identifying the calling session");
    const currentSessionId = await (0, utils_2.requireOwnSessionId)(data, user.id);
    const redis = redis_1.RedisSingleton.getInstance();
    const rateKey = `password-change-attempts:${user.id}`;
    let attempts;
    try {
        attempts = await redis.incr(rateKey);
        if (attempts === 1) {
            await redis.expire(rateKey, ATTEMPT_WINDOW_SECONDS);
        }
    }
    catch (_a) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Attempt store unavailable");
        throw (0, error_1.createError)({
            statusCode: 503,
            message: "Password changes are temporarily unavailable. Please try again shortly.",
        });
    }
    if (attempts > MAX_ATTEMPTS) {
        if (attempts === MAX_ATTEMPTS + 1) {
            void (0, user_activity_1.recordUserActivity)({
                userId: user.id,
                type: "auth.login_failed",
                title: "Failed password change attempts",
                description: "Too many incorrect attempts while changing the account password",
                severity: "warning",
                req: data,
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Too many password change attempts");
        throw (0, error_1.createError)({
            statusCode: 429,
            message: "Too many attempts. Please wait 15 minutes before trying again.",
        });
    }
    if (newPassword.length > MAX_PASSWORD_LENGTH) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("New password exceeds the maximum length");
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `Password must be ${MAX_PASSWORD_LENGTH} characters or fewer.`,
        });
    }
    if (confirmPassword !== undefined && confirmPassword !== newPassword) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Password confirmation mismatch");
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "The new passwords do not match.",
        });
    }
    if (newPassword === currentPassword) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("New password matches the current one");
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Your new password must be different from your current one.",
        });
    }
    const account = await db_1.models.user.findByPk(user.id);
    if (!account) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("User account not found");
        throw (0, error_1.createError)({ statusCode: 404, message: "User not found" });
    }
    if (account.status === "BANNED" ||
        account.status === "SUSPENDED" ||
        account.status === "INACTIVE") {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Account status does not permit a password change");
        throw (0, error_1.createError)({
            statusCode: 403,
            message: "Your account is not active. Please contact support to change your password.",
        });
    }
    if (!account.password) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Account has no password to change");
        throw (0, error_1.createError)({
            statusCode: 409,
            message: 'This account signs in with Google or a connected wallet and has no password yet. Use "Set a password" to receive a secure link by email.',
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Verifying the current password");
    let currentOk = false;
    try {
        currentOk = await (0, passwords_1.verifyPassword)(account.password, currentPassword);
    }
    catch (_b) {
        currentOk = false;
    }
    if (!currentOk) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Current password incorrect");
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "The current password you entered is incorrect.",
        });
    }
    if (!(0, passwords_1.validatePassword)(newPassword)) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("New password fails the password policy");
        throw (0, error_1.createError)({ statusCode: 400, message: POLICY_MESSAGE });
    }
    let sameAsCurrent = false;
    try {
        sameAsCurrent = await (0, passwords_1.verifyPassword)(account.password, newPassword);
    }
    catch (_c) {
        sameAsCurrent = false;
    }
    if (sameAsCurrent) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("New password matches the current one");
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Your new password must be different from your current one.",
        });
    }
    const twoFactor = await db_1.models.twoFactor.findOne({
        where: { userId: user.id },
    });
    const twoFactorGloballyEnabled = await cache_1.CacheManager.getInstance().getSettingBool("twoFactorStatus", true);
    const twoFactorRequired = twoFactorGloballyEnabled && Boolean(twoFactor === null || twoFactor === void 0 ? void 0 : twoFactor.enabled);
    if (twoFactorRequired) {
        if (!twoFactorCode) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Two-factor code missing");
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "A two-factor code is required to change your password.",
            });
        }
        const otpRateKey = `password-change-2fa-attempts:${user.id}`;
        let otpAttempts;
        try {
            otpAttempts = await redis.incr(otpRateKey);
            if (otpAttempts === 1) {
                await redis.expire(otpRateKey, OTP_ATTEMPT_WINDOW_SECONDS);
            }
        }
        catch (_d) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Attempt store unavailable");
            throw (0, error_1.createError)({
                statusCode: 503,
                message: "Password changes are temporarily unavailable. Please try again shortly.",
            });
        }
        if (otpAttempts > OTP_MAX_ATTEMPTS) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Too many two-factor attempts");
            throw (0, error_1.createError)({
                statusCode: 429,
                message: "Too many verification attempts. Please wait a few minutes before trying again.",
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Verifying two-factor code");
        const secret = (0, utils_1.resolveTwoFactorSecret)(twoFactor);
        if (!(await (0, utils_1.consumeEnrolledOtp)(user.id, secret, twoFactorCode, twoFactor.type))) {
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Code invalid, checking recovery codes");
            await (0, utils_1.consumeRecoveryCode)({ id: twoFactor.id, recoveryCodes: twoFactor.recoveryCodes }, twoFactorCode);
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Recovery code accepted");
        }
        await redis.del(otpRateKey).catch(() => undefined);
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Storing the new password");
    const hashed = await (0, passwords_1.hashPassword)(newPassword);
    await account.update({ password: hashed });
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Signing out other devices");
    let revoked = 0;
    let revocationFailed = false;
    try {
        revoked = await (0, token_1.revokeOtherUserSessions)(user.id, currentSessionId);
    }
    catch (err) {
        revocationFailed = true;
        console_1.logger.error("PASSWORD", "Password changed but other sessions could not be revoked", err);
    }
    await redis.del(rateKey).catch(() => undefined);
    void (0, user_activity_1.recordUserActivity)({
        userId: user.id,
        type: "security.password_changed",
        title: "Password changed",
        description: revoked > 0
            ? `Password changed from the security settings; ${revoked} other session(s) signed out`
            : "Password changed from the security settings",
        severity: "warning",
        req: data,
        metadata: {
            revokedSessions: revoked,
            revocationFailed,
            twoFactorVerified: twoFactorRequired,
        },
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Password changed");
    return {
        message: revocationFailed
            ? "Your password has been changed, but other devices could not be signed out. Use Sign Out All to retry."
            : revoked > 0
                ? `Your password has been changed and ${revoked} other device(s) were signed out.`
                : "Your password has been changed.",
        revokedSessions: revoked,
    };
};
