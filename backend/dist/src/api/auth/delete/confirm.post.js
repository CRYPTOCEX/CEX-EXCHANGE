"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const error_1 = require("@b/utils/error");
const db_1 = require("@b/db");
const token_1 = require("@b/utils/token");
const utils_1 = require("../utils");
const emails_1 = require("@b/utils/emails");
exports.metadata = {
    summary: "Check account deletion code and delete user",
    operationId: "checkAccountDeletionCode",
    tags: ["Account"],
    description: "Checks the deletion code, deletes the user's account if valid, and sends a confirmation email.",
    requiresAuth: false,
    logModule: "ACCOUNT",
    logTitle: "Confirm account deletion",
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
                            description: "Email of the user confirming account deletion",
                        },
                        token: {
                            type: "string",
                            description: "Account deletion confirmation token",
                        },
                    },
                    required: ["email", "token"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "User account deleted successfully",
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
            description: "Invalid request or token",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: {
                                type: "string",
                                description: "Error message",
                            },
                        },
                    },
                },
            },
        },
    },
};
exports.default = async (data) => {
    const { body, ctx } = data;
    const { email, token } = body;
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating account deletion confirmation");
        if (!email || !token) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Email and token are required");
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Email and token are required",
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step(`Looking up user: ${email}`);
        const user = await db_1.models.user.findOne({ where: { email } });
        if (!user) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("User not found");
            throw (0, error_1.createError)({ message: "User not found", statusCode: 404 });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Verifying deletion token");
        const decodedToken = await (0, token_1.verifyResetToken)(token);
        if (!decodedToken) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Invalid or expired token");
            throw (0, error_1.createError)({ message: "Invalid or expired token", statusCode: 400 });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking token usage");
        try {
            if (decodedToken.jti !== (await (0, utils_1.addOneTimeToken)(decodedToken.jti, new Date()))) {
                ctx === null || ctx === void 0 ? void 0 : ctx.fail("Token already used");
                throw (0, error_1.createError)({
                    statusCode: 500,
                    message: "Token has already been used",
                });
            }
        }
        catch (error) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Token validation failed");
            throw (0, error_1.createError)({
                statusCode: 500,
                message: "Token has already been used",
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Deleting user account");
        await db_1.models.user.destroy({ where: { id: user.id } });
        try {
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Sending deletion confirmation email");
            await emails_1.emailQueue.add({
                emailData: {
                    TO: user.email,
                    FIRSTNAME: user.firstName,
                },
                emailType: "AccountDeletionConfirmed",
            });
            ctx === null || ctx === void 0 ? void 0 : ctx.success(`User account ${email} deleted successfully`);
            return {
                message: "User account deleted successfully",
            };
        }
        catch (error) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Failed to send deletion confirmation email");
            throw (0, error_1.createError)({ message: error.message, statusCode: 500 });
        }
    }
    catch (error) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(error.message || "Account deletion confirmation failed");
        throw error;
    }
};
