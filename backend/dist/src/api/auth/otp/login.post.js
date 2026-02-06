"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const error_1 = require("@b/utils/error");
const utils_1 = require("../utils");
const utils_2 = require("./utils");
const db_1 = require("@b/db");
exports.metadata = {
    summary: "Verifies the OTP or recovery code for login",
    operationId: "verifyLoginOTP",
    tags: ["Auth"],
    description: "Verifies the OTP for login and returns a session token. If the OTP is invalid, the provided code is checked against the recovery codes.",
    requiresAuth: false,
    logModule: "2FA",
    logTitle: "2FA login verification",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        id: {
                            type: "string",
                            format: "uuid",
                            description: "ID of the user",
                        },
                        otp: {
                            type: "string",
                            description: "OTP or recovery code to verify",
                        },
                    },
                    required: ["id", "otp"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "OTP or recovery code verified successfully, user logged in",
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
        400: { description: "Invalid request" },
        401: { description: "Unauthorized" },
    },
};
exports.default = async (data) => {
    const { body, ctx } = data;
    const { id, otp } = body;
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating 2FA login request");
        (0, utils_2.validateOtpRequest)(id, otp);
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Looking up user with 2FA");
        const user = await (0, utils_2.getUserWith2FA)(id);
        let secretToVerify = user.twoFactor.secret;
        let wasPlaintext = false;
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking secret encryption");
        if ((0, utils_2.isEncrypted)(secretToVerify)) {
            try {
                secretToVerify = (0, utils_2.decrypt)(secretToVerify);
            }
            catch (err) {
                ctx === null || ctx === void 0 ? void 0 : ctx.fail("Failed to decrypt 2FA secret");
                throw (0, error_1.createError)({
                    statusCode: 500,
                    message: "Could not decrypt 2FA secret. User data may be corrupted.",
                });
            }
        }
        else {
            wasPlaintext = true;
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Secret is in plaintext, will re-encrypt after verification", "warn");
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Verifying OTP code");
        if (!(0, utils_2.verifyOtp)(secretToVerify, otp)) {
            ctx === null || ctx === void 0 ? void 0 : ctx.step("OTP verification failed, checking recovery codes");
            await (0, utils_2.consumeRecoveryCode)(user.twoFactor, otp);
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Recovery code consumed successfully");
        }
        else if (wasPlaintext) {
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Re-encrypting plaintext secret");
            const encrypted = (0, utils_2.encrypt)(user.twoFactor.secret);
            await db_1.models.twoFactor.update({ secret: encrypted }, { where: { id: user.twoFactor.id } });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Generating session tokens");
        const result = await (0, utils_1.returnUserWithTokens)({
            user,
            message: "You have been logged in successfully",
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`User ${user.email} logged in with 2FA`);
        return result;
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : "2FA login failed";
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(errorMessage);
        throw error;
    }
};
