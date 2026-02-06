"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const error_1 = require("@b/utils/error");
const db_1 = require("@b/db");
const constants_1 = require("@b/utils/constants");
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
    const { phoneNumber } = body;
    if (!phoneNumber) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Phone number missing");
        throw (0, error_1.createError)({ statusCode: 400, message: "Phone required" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Generating verification code");
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Sending SMS via Twilio");
    try {
        const twilio = (await Promise.resolve().then(() => __importStar(require("twilio")))).default;
        const twilioClient = twilio(constants_1.APP_TWILIO_ACCOUNT_SID, constants_1.APP_TWILIO_AUTH_TOKEN);
        await twilioClient.messages.create({
            body: `Your verification code is: ${code}`,
            from: process.env.APP_TWILIO_PHONE_NUMBER,
            to: phoneNumber,
        });
    }
    catch (err) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Error sending SMS");
        throw (0, error_1.createError)({ statusCode: 500, message: "Error sending SMS" });
    }
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
        },
    };
    await userRecord.update({ profile: updatedProfile });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Verification code sent successfully");
    return { message: "Verification code sent to phone." };
};
