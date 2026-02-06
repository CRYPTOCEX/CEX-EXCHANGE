"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const error_1 = require("@b/utils/error");
const db_1 = require("@b/db");
exports.metadata = {
    summary: "Toggles OTP status",
    operationId: "toggleOtp",
    tags: ["Auth"],
    description: "Enables or disables OTP for the user",
    requiresAuth: true,
    logModule: "2FA",
    logTitle: "Toggle 2FA status",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        status: {
                            type: "boolean",
                            description: "Status to set for OTP (enabled or disabled)",
                        },
                    },
                    required: ["status"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "OTP status updated successfully",
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
        },
        401: {
            description: "Unauthorized",
        },
    },
};
exports.default = async (data) => {
    const { body, user, ctx } = data;
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating user authentication");
        if (!user) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("User not authenticated");
            throw (0, error_1.createError)({ statusCode: 401, message: "unauthorized" });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating status value");
        if (typeof body.status !== "boolean") {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Status must be a boolean");
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Status must be a boolean value",
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step(`${body.status ? "Enabling" : "Disabling"} 2FA`);
        const result = await toggleOTPQuery(user.id, body.status);
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`2FA ${body.status ? "enabled" : "disabled"} successfully`);
        return result;
    }
    catch (error) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(error.message || "Failed to toggle 2FA");
        throw error;
    }
};
async function toggleOTPQuery(userId, status) {
    return await db_1.models.twoFactor.update({ enabled: status }, { where: { userId }, returning: true });
}
