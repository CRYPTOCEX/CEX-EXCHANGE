"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const crypto_1 = __importDefault(require("crypto"));
const error_1 = require("@b/utils/error");
const db_1 = require("@b/db");
const sms_1 = require("@b/utils/sms");
const utils_1 = require("@b/api/auth/otp/utils");
exports.metadata = {
    summary: "Send phone verification code",
    operationId: "sendPhoneVerificationCode",
    tags: ["User", "Phone"],
    requiresAuth: true,
    logModule: "USER",
    logTitle: "Send phone verification code",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        phoneNumber: {
                            type: "string",
                            description: "Phone number to verify",
                        },
                        currentOtp: {
                            type: "string",
                            description: "Required while SMS two-factor is enabled: a current code " +
                                "from that factor, or a recovery code. Verifying a new " +
                                "number moves where the account's codes are sent.",
                        },
                    },
                    required: ["phoneNumber"],
                },
            },
        },
    },
    responses: {
        200: { description: "Code sent" },
        400: { description: "Bad request" },
        401: { description: "Unauthorized" },
    },
};
exports.default = async (data) => {
    const { user, body, ctx } = data;
    if (!user) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("User not authenticated");
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const { phoneNumber: rawPhoneNumber, currentOtp } = body;
    if (!rawPhoneNumber) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Phone number missing");
        throw (0, error_1.createError)({ statusCode: 400, message: "Phone required" });
    }
    const phoneNumber = `+${String(rawPhoneNumber).replace(/\D/g, "").slice(0, 15)}`;
    if (!/^\+\d{7,15}$/.test(phoneNumber)) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Invalid phone number");
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Phone number must be in international format, e.g. +254711972926",
        });
    }
    await (0, utils_1.assertPhoneChangeProof)(user.id, phoneNumber, currentOtp, ctx);
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Generating verification code");
    const code = crypto_1.default.randomInt(100000, 1000000).toString();
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Storing verification code");
    const userRecord = await db_1.models.user.findByPk(user.id);
    if (!userRecord) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("User not found");
        throw (0, error_1.createError)({ statusCode: 404, message: "User not found" });
    }
    const currentProfile = userRecord.profile || {};
    const updatedProfile = {
        ...currentProfile,
        phoneVerification: {
            code,
            expiresAt: new Date(Date.now() + 10 * 60000).toISOString(),
            phoneTemp: phoneNumber,
            attempts: 0,
        },
    };
    await userRecord.update({ profile: updatedProfile });
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Sending SMS");
    try {
        await (0, sms_1.sendSmsCode)(phoneNumber, code, "PHONE_VERIFICATION");
    }
    catch (err) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Error sending SMS");
        throw (0, error_1.createError)({ statusCode: 500, message: "Error sending SMS" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Verification code sent successfully");
    return { message: "Verification code sent to phone." };
};
