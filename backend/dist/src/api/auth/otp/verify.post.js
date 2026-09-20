"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const error_1 = require("@b/utils/error");
const two_factor_code_1 = require("@b/utils/two-factor-code");
const save_post_1 = require("./save.post");
const utils_1 = require("./utils");
exports.metadata = {
    summary: "Verifies the OTP",
    operationId: "verifyOTP",
    tags: ["Auth"],
    description: "Verifies the OTP and saves it",
    requiresAuth: true,
    logModule: "2FA",
    logTitle: "Verify 2FA setup",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        otp: {
                            type: "string",
                            description: "OTP to verify",
                        },
                        secret: {
                            type: "string",
                            description: "Generated OTP secret",
                        },
                        type: {
                            type: "string",
                            enum: ["EMAIL", "SMS", "APP"],
                            description: "Type of 2FA",
                        },
                        currentOtp: {
                            type: "string",
                            description: "When two-factor is ALREADY enabled: a current code from the " +
                                "existing method (or a recovery code), required before it can " +
                                "be replaced.",
                        },
                    },
                    required: ["otp", "secret", "type"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "OTP verified and saved successfully",
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
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating OTP input");
        if (!body.otp || !body.secret || !body.type) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Missing required fields");
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "OTP, secret, and type are required",
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Verifying OTP");
        const isValid = (0, two_factor_code_1.verifyTwoFactorCode)(body.secret, body.otp, body.type);
        if (!isValid) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Invalid OTP");
            throw (0, error_1.createError)({
                statusCode: 401,
                message: "Invalid OTP",
            });
        }
        await (0, utils_1.assertRebindProof)(user.id, body.secret, body.currentOtp, ctx);
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Saving 2FA settings");
        const result = await (0, save_post_1.saveOrUpdateOTP)(user.id, body.secret, body.type);
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`2FA setup completed for ${body.type}`);
        return result;
    }
    catch (error) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(error.message || "OTP verification failed");
        throw error;
    }
};
