"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const token_1 = require("@b/utils/token");
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const emails_1 = require("@b/utils/emails");
exports.metadata = {
    summary: "Generate account deletion confirmation code",
    operationId: "generateAccountDeletionCode",
    tags: ["Account"],
    description: "Generates a code for confirming account deletion and sends it to the user's email.",
    requiresAuth: true,
    logModule: "ACCOUNT",
    logTitle: "Request account deletion",
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
                            description: "Email of the user requesting account deletion",
                        },
                    },
                    required: ["email"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "Deletion confirmation code generated successfully",
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
    const { email } = body;
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating account deletion request");
        if (!email) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Email is required");
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Email is required",
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step(`Looking up user: ${email}`);
        const user = await db_1.models.user.findOne({ where: { email } });
        if (!user) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("User not found");
            throw (0, error_1.createError)({ message: "User not found", statusCode: 404 });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Generating deletion confirmation token");
        const token = await (0, token_1.generateEmailToken)({ user: { id: user.id } });
        try {
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Sending deletion confirmation email");
            await emails_1.emailQueue.add({
                emailData: {
                    TO: user.email,
                    FIRSTNAME: user.firstName,
                    TOKEN: token,
                },
                emailType: "AccountDeletionConfirmation",
            });
            ctx === null || ctx === void 0 ? void 0 : ctx.success(`Deletion confirmation sent to ${email}`);
            return {
                message: "Deletion confirmation code sent successfully",
            };
        }
        catch (error) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Failed to send deletion confirmation email");
            throw (0, error_1.createError)({ message: error.message, statusCode: 500 });
        }
    }
    catch (error) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(error.message || "Account deletion request failed");
        throw error;
    }
};
