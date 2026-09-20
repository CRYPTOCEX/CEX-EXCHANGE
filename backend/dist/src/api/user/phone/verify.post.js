"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const crypto_1 = __importDefault(require("crypto"));
const error_1 = require("@b/utils/error");
const db_1 = require("@b/db");
const user_activity_1 = require("@b/utils/user-activity");
const utils_1 = require("@b/api/auth/otp/utils");
const MAX_PHONE_VERIFY_ATTEMPTS = 5;
const timingSafeEqual = (a, b) => {
    const aBuf = Buffer.from(String(a));
    const bBuf = Buffer.from(String(b));
    if (aBuf.length !== bBuf.length)
        return false;
    return crypto_1.default.timingSafeEqual(aBuf, bBuf);
};
exports.metadata = {
    summary: "Verify phone number with code",
    operationId: "verifyPhoneNumber",
    tags: ["User", "Phone"],
    requiresAuth: true,
    logModule: "USER",
    logTitle: "Verify phone number",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        code: {
                            type: "string",
                            description: "Verification code sent to phone",
                        },
                        currentOtp: {
                            type: "string",
                            description: "Required while SMS two-factor is enabled: a current code " +
                                "from that factor, or a recovery code.",
                        },
                    },
                    required: ["code"],
                },
            },
        },
    },
    responses: {
        200: { description: "Phone verified" },
        400: { description: "Invalid or expired code" },
        401: { description: "Unauthorized" },
    },
};
exports.default = async (data) => {
    var _a;
    const { user, body, ctx } = data;
    if (!user) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("User not authenticated");
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const { code, currentOtp } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Retrieving user record");
    const userRecord = await db_1.models.user.findByPk(user.id);
    if (!userRecord) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("User not found");
        throw (0, error_1.createError)({ statusCode: 404, message: "User not found" });
    }
    const profile = userRecord.profile || {};
    const phoneVerification = profile.phoneVerification;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating verification code");
    if (!(phoneVerification === null || phoneVerification === void 0 ? void 0 : phoneVerification.code) ||
        !(phoneVerification === null || phoneVerification === void 0 ? void 0 : phoneVerification.expiresAt) ||
        new Date(phoneVerification.expiresAt) < new Date()) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Invalid or expired verification code");
        throw (0, error_1.createError)({ statusCode: 400, message: "Invalid or expired code" });
    }
    const attempts = ((_a = phoneVerification.attempts) !== null && _a !== void 0 ? _a : 0) + 1;
    if (attempts > MAX_PHONE_VERIFY_ATTEMPTS) {
        const { phoneVerification: _drop, ...restProfile } = profile;
        await userRecord.update({ profile: restProfile });
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Too many invalid attempts");
        throw (0, error_1.createError)({
            statusCode: 429,
            message: "Too many invalid attempts. Please request a new code.",
        });
    }
    if (!timingSafeEqual(phoneVerification.code, String(code !== null && code !== void 0 ? code : ""))) {
        await userRecord.update({
            profile: {
                ...profile,
                phoneVerification: { ...phoneVerification, attempts },
            },
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Invalid or expired verification code");
        throw (0, error_1.createError)({ statusCode: 400, message: "Invalid or expired code" });
    }
    await (0, utils_1.assertPhoneChangeProof)(user.id, phoneVerification.phoneTemp, currentOtp, ctx);
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating phone verification status");
    const { phoneVerification: _, ...restProfile } = profile;
    await userRecord.update({
        phone: phoneVerification.phoneTemp,
        phoneVerified: true,
        profile: restProfile,
    });
    void (0, user_activity_1.recordUserActivity)({
        userId: user.id,
        type: "security.phone_verified",
        title: "Phone verified",
        description: phoneVerification.phoneTemp || "Phone number confirmed",
        severity: "success",
        req: data,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Phone number verified successfully");
    return { message: "Phone number verified successfully." };
};
