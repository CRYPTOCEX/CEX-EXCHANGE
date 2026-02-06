"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const error_1 = require("@b/utils/error");
const db_1 = require("@b/db");
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
    const { user, body, ctx } = data;
    if (!user) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("User not authenticated");
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const { code } = body;
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
        phoneVerification.code !== code ||
        new Date(phoneVerification.expiresAt) < new Date()) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Invalid or expired verification code");
        throw (0, error_1.createError)({ statusCode: 400, message: "Invalid or expired code" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating phone verification status");
    const { phoneVerification: _, ...restProfile } = profile;
    await userRecord.update({
        phone: phoneVerification.phoneTemp,
        phoneVerified: true,
        profile: restProfile,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Phone number verified successfully");
    return { message: "Phone number verified successfully." };
};
