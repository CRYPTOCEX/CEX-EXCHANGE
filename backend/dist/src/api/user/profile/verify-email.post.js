"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const error_1 = require("@b/utils/error");
const db_1 = require("@b/db");
const utils_1 = require("../../auth/utils");
const console_1 = require("@b/utils/console");
const cache_1 = require("@b/utils/cache");
exports.metadata = {
    summary: "Resend Email Verification for Authenticated User",
    description: "Sends a verification email to the authenticated user's email address",
    operationId: "resendEmailVerificationAuth",
    tags: ["User", "Profile"],
    requiresAuth: true,
    logModule: "USER",
    logTitle: "Resend email verification",
    responses: {
        200: {
            description: "Verification email sent successfully",
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
            description: "Email already verified or invalid request",
        },
        500: {
            description: "Internal server error",
        },
    },
};
exports.default = async (data) => {
    const { user, ctx } = data;
    if (!user) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("User not authenticated");
        throw (0, error_1.createError)({
            statusCode: 401,
            message: "User not authenticated",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Retrieving user record");
    const fullUser = await db_1.models.user.findByPk(user.id);
    if (!fullUser) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("User not found");
        throw (0, error_1.createError)({
            statusCode: 404,
            message: "User not found",
        });
    }
    if (fullUser.emailVerified) {
        ctx === null || ctx === void 0 ? void 0 : ctx.warn("Email already verified");
        return {
            message: "Email is already verified",
        };
    }
    if (!fullUser.email) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("User has no email address");
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "No email address associated with this account",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking email verification configuration");
    const cacheManager = cache_1.CacheManager.getInstance();
    const verifyEmailEnabled = (await cacheManager.getSetting("verifyEmailStatus")) === "true";
    if (!verifyEmailEnabled) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Email verification not enabled");
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Email verification is not enabled on this platform",
        });
    }
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Sending verification email");
        await (0, utils_1.sendEmailVerificationToken)(fullUser.id, fullUser.email);
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Verification email sent successfully");
        return {
            message: "Verification email sent successfully. Please check your inbox.",
        };
    }
    catch (error) {
        console_1.logger.error("USER", "Error sending verification email", error);
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Failed to send verification email");
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Failed to send verification email. Please try again later.",
        });
    }
};
