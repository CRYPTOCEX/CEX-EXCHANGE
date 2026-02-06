"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyEmailTokenQuery = exports.metadata = void 0;
const error_1 = require("@b/utils/error");
const db_1 = require("@b/db");
const token_1 = require("@b/utils/token");
const utils_1 = require("../utils");
exports.metadata = {
    summary: "Verifies the email with the provided token",
    operationId: "verifyEmailToken",
    tags: ["Auth"],
    description: "Verifies the email with the provided token",
    requiresAuth: false,
    logModule: "EMAIL",
    logTitle: "Email verification",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        token: {
                            type: "string",
                            description: "The email verification token",
                        },
                    },
                    required: ["token"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "Email verified successfully",
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
            description: "Invalid request (e.g., missing or invalid token)",
        },
        404: {
            description: "Token not found or expired",
        },
    },
};
exports.default = async (data) => {
    const { body, ctx } = data;
    const { token } = body;
    return (0, exports.verifyEmailTokenQuery)(token, ctx);
};
const verifyEmailTokenQuery = async (token, ctx) => {
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating email verification token");
        if (!token) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Token is required");
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Token is required",
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Verifying token");
        const userId = await (0, token_1.verifyEmailCode)(token);
        if (!userId) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Token not found or expired");
            throw (0, error_1.createError)({
                statusCode: 404,
                message: "Token not found or expired",
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Looking up user");
        const user = await db_1.models.user.findByPk(userId);
        if (!user) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("User not found");
            throw (0, error_1.createError)({
                statusCode: 404,
                message: "User not found",
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating email verification status");
        await user.update({
            emailVerified: true,
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Generating session tokens");
        const result = await (0, utils_1.returnUserWithTokens)({
            user,
            message: "Email verified successfully",
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`Email verified for user ${user.email}`);
        return result;
    }
    catch (error) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(error.message || "Email verification failed");
        throw error;
    }
};
exports.verifyEmailTokenQuery = verifyEmailTokenQuery;
