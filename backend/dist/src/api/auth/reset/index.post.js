"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const token_1 = require("@b/utils/token");
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const emails_1 = require("@b/utils/emails");
const pow_captcha_1 = require("@b/utils/pow-captcha");
exports.metadata = {
    summary: "Initiates a password reset process for a user",
    operationId: "resetPassword",
    tags: ["Auth"],
    description: "Initiates a password reset process for a user and sends an email with a reset link",
    requiresAuth: false,
    logModule: "PASSWORD",
    logTitle: "Password reset request",
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
                    required: ["email"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "Password reset process initiated successfully",
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
                                    message: {
                                        type: "string",
                                        description: "Success message",
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        400: {
            description: "Invalid request (e.g., missing email)",
        },
        404: {
            description: "User not found with the provided email",
        },
    },
};
exports.default = async (data) => {
    const { body, ctx } = data;
    const { email, powSolution } = body;
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating password reset request");
        if (!email) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Email is required");
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Email is required",
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Verifying security challenge");
        try {
            await (0, pow_captcha_1.verifyPowOrThrow)(powSolution, "reset");
        }
        catch (powError) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Security verification failed");
            throw (0, error_1.createError)({
                statusCode: 400,
                message: powError instanceof Error ? powError.message : "Security verification failed",
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step(`Looking up user: ${email}`);
        const user = await db_1.models.user.findOne({ where: { email } });
        if (!user) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("User not found");
            throw (0, error_1.createError)({
                statusCode: 404,
                message: "User not found",
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Generating password reset token");
        const resetToken = await (0, token_1.generateResetToken)({
            user: {
                id: user.id,
            },
        });
        try {
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Sending password reset email");
            await emails_1.emailQueue.add({
                emailData: {
                    TO: user.email,
                    FIRSTNAME: user.firstName,
                    LAST_LOGIN: user.lastLogin,
                    TOKEN: resetToken,
                },
                emailType: "PasswordReset",
            });
            ctx === null || ctx === void 0 ? void 0 : ctx.success(`Password reset email sent to ${email}`);
            return {
                message: "Email with reset instructions sent successfully",
            };
        }
        catch (error) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Failed to send password reset email");
            throw (0, error_1.createError)({
                message: error.message,
                statusCode: 500,
            });
        }
    }
    catch (error) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(error.message || "Password reset request failed");
        throw error;
    }
};
