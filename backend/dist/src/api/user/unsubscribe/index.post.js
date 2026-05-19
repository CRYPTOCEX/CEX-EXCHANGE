"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const token_1 = require("@b/utils/token");
exports.metadata = {
    summary: "Update user notification preferences",
    description: "Updates the notification preferences for a user using their unsubscribe token.",
    operationId: "updateUnsubscribePreferences",
    tags: ["User", "Unsubscribe"],
    requiresAuth: false,
    query: [
        {
            name: "token",
            in: "query",
            required: true,
            schema: { type: "string" },
            description: "The unsubscribe token from the email",
        },
    ],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        email: { type: "boolean", description: "Email notification preference" },
                        sms: { type: "boolean", description: "SMS notification preference" },
                        push: { type: "boolean", description: "Push notification preference" },
                    },
                },
            },
        },
    },
    responses: {
        200: {
            description: "Preferences updated successfully.",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: { type: "string" },
                            email: { type: "boolean" },
                            sms: { type: "boolean" },
                            push: { type: "boolean" },
                        },
                    },
                },
            },
        },
        400: { description: "Invalid or expired token" },
        404: { description: "User not found" },
        500: { description: "Internal Server Error" },
    },
};
exports.default = async (data) => {
    const { ctx, query, body } = data;
    const { token } = query;
    const { email, sms, push } = body;
    if (!token) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Token is required");
        throw (0, error_1.createError)({ statusCode: 400, message: "Token is required" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Verifying unsubscribe token");
    const userId = await (0, token_1.verifyUnsubscribeToken)(token);
    if (!userId) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Invalid or expired token");
        throw (0, error_1.createError)({ statusCode: 400, message: "Invalid or expired token" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching user");
    const user = await db_1.models.user.findByPk(userId);
    if (!user) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("User not found");
        throw (0, error_1.createError)({ statusCode: 404, message: "User not found" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating preferences");
    const currentSettings = user.settings || { email: true, sms: true, push: true };
    const newSettings = {
        email: email !== undefined ? email : currentSettings.email,
        sms: sms !== undefined ? sms : currentSettings.sms,
        push: push !== undefined ? push : currentSettings.push,
    };
    await user.update({ settings: newSettings });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Preferences updated successfully");
    return {
        message: "Preferences updated successfully",
        ...newSettings,
    };
};
