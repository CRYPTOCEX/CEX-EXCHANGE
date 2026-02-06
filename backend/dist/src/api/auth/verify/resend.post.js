"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const error_1 = require("@b/utils/error");
const db_1 = require("@b/db");
const utils_1 = require("../utils");
const cache_1 = require("@b/utils/cache");
exports.metadata = {
    summary: "Resends email verification token",
    operationId: "resendEmailVerification",
    tags: ["Auth"],
    description: "Resends email verification token to user's email address",
    requiresAuth: false,
    logModule: "EMAIL",
    logTitle: "Resend verification email",
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
                            description: "User's email address",
                        },
                    },
                    required: ["email"],
                },
            },
        },
    },
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
            description: "Invalid request (e.g., email already verified)",
        },
        404: {
            description: "User not found",
        },
    },
};
exports.default = async (data) => {
    const { body, ctx } = data;
    const { email } = body;
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating resend request");
        if (!email) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Email is required");
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Email is required",
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step(`Looking up user: ${email}`);
        const user = await db_1.models.user.findOne({
            where: { email },
        });
        if (!user) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("User not found");
            throw (0, error_1.createError)({
                statusCode: 404,
                message: "User not found with this email address",
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking email verification status");
        if (user.emailVerified) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Email already verified");
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Email is already verified",
            });
        }
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
            await (0, utils_1.sendEmailVerificationToken)(user.id, user.email || "");
            ctx === null || ctx === void 0 ? void 0 : ctx.success(`Verification email resent to ${email}`);
            return {
                message: "Verification email sent successfully. Please check your inbox.",
            };
        }
        catch (error) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Failed to send verification email");
            throw (0, error_1.createError)({
                statusCode: 500,
                message: "Failed to send verification email. Please try again later.",
            });
        }
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to resend verification email";
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(errorMessage);
        throw error;
    }
};
