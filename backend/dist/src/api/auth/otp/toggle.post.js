"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const error_1 = require("@b/utils/error");
const db_1 = require("@b/db");
const utils_1 = require("./utils");
exports.metadata = {
    summary: "Toggles OTP status",
    operationId: "toggleOtp",
    tags: ["Auth"],
    description: "Enables or disables two-factor authentication for the signed-in user. Turning it OFF requires re-proving identity with a current OTP or the account password.",
    requiresAuth: true,
    middleware: ["twoFactorToggle"],
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
                        otp: {
                            type: "string",
                            description: "Current code from the enrolled method. Required to disable 2FA (a password may be supplied instead).",
                        },
                        password: {
                            type: "string",
                            description: "Account password. Accepted in place of an OTP when disabling 2FA.",
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
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Loading the enrolled method");
        const twoFactor = await db_1.models.twoFactor.findOne({
            where: { userId: user.id },
        });
        if (!twoFactor) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("No 2FA method is enrolled");
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "No two-factor method is set up on this account yet. Complete the setup first.",
            });
        }
        if (twoFactor.enabled === body.status) {
            ctx === null || ctx === void 0 ? void 0 : ctx.success(`2FA is already ${body.status ? "enabled" : "disabled"}`);
            return {
                message: `Two-factor authentication is already ${body.status ? "enabled" : "disabled"}`,
                enabled: twoFactor.enabled,
            };
        }
        if (!body.status) {
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Re-authenticating before disabling 2FA");
            await (0, utils_1.assertDisableProof)(user.id, twoFactor, body);
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step(`${body.status ? "Enabling" : "Disabling"} 2FA`);
        await db_1.models.twoFactor.update({ enabled: body.status }, { where: { id: twoFactor.id } });
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`2FA ${body.status ? "enabled" : "disabled"} successfully`);
        return {
            message: `Two-factor authentication ${body.status ? "enabled" : "disabled"} successfully`,
            enabled: body.status,
        };
    }
    catch (error) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(error.message || "Failed to toggle 2FA");
        throw error;
    }
};
