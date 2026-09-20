"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const token_1 = require("@b/utils/token");
exports.metadata = {
    summary: "Get user notification preferences",
    description: "Retrieves the notification preferences for a user using their unsubscribe token.",
    operationId: "getUnsubscribePreferences",
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
    responses: {
        200: {
            description: "Preferences retrieved successfully.",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
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
    var _a, _b, _c;
    const { ctx, query } = data;
    const { token } = query;
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
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching user preferences");
    const user = await db_1.models.user.findByPk(userId, {
        attributes: ["id", "email", "firstName", "settings"],
    });
    if (!user) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("User not found");
        throw (0, error_1.createError)({ statusCode: 404, message: "User not found" });
    }
    const settings = user.settings || { email: true, sms: true, push: true };
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Preferences retrieved successfully");
    return {
        email: (_a = settings.email) !== null && _a !== void 0 ? _a : true,
        sms: (_b = settings.sms) !== null && _b !== void 0 ? _b : true,
        push: (_c = settings.push) !== null && _c !== void 0 ? _c : true,
    };
};
