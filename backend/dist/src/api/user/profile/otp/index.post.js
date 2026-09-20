"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
exports.saveOTPQuery = saveOTPQuery;
const error_1 = require("@b/utils/error");
const db_1 = require("@b/db");
const crypto_1 = __importDefault(require("crypto"));
const console_1 = require("@b/utils/console");
const query_1 = require("@b/utils/query");
const user_activity_1 = require("@b/utils/user-activity");
const utils_1 = require("@b/api/auth/otp/utils");
const two_factor_code_1 = require("@b/utils/two-factor-code");
exports.metadata = {
    summary: "Saves the OTP configuration for the user and generates recovery codes",
    operationId: "saveOTP",
    description: "Saves the OTP configuration for the user and generates 12 recovery codes for recovery",
    tags: ["Profile"],
    requiresAuth: true,
    logModule: "USER",
    logTitle: "Save OTP configuration",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        secret: {
                            type: "string",
                            description: "OTP secret",
                        },
                        type: {
                            type: "string",
                            description: "Type of OTP",
                            enum: ["EMAIL", "SMS", "APP"],
                        },
                        otp: {
                            type: "string",
                            description: "A current code for `secret`, proving the caller possesses it. " +
                                "Required: without it a session alone could bind an " +
                                "attacker-chosen second factor to this account.",
                        },
                        currentOtp: {
                            type: "string",
                            description: "When two-factor is ALREADY enabled with a different secret: " +
                                "a current code from the existing method (or a recovery " +
                                "code), required before it can be replaced. The shipped flow " +
                                "reaches this route with the row already rebound by /verify, " +
                                "which passes without it.",
                        },
                    },
                    required: ["secret", "type", "otp"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "OTP configuration and recovery codes saved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            status: {
                                type: "boolean",
                                description: "Indicates if the request was successful",
                            },
                            statusCode: {
                                type: "number",
                                description: "HTTP status code",
                                example: 200,
                            },
                            data: {
                                type: "object",
                                properties: {
                                    message: { type: "string", description: "Success message" },
                                    recoveryCodes: {
                                        type: "array",
                                        items: { type: "string" },
                                        description: "Array of generated recovery codes",
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("User"),
        500: query_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    const { user, body, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("User not authenticated");
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const { secret, type, otp } = body;
    if (!otp || !(0, two_factor_code_1.verifyTwoFactorCode)(secret, String(otp), type)) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("OTP possession not proven");
        throw (0, error_1.createError)({
            statusCode: 401,
            message: "Invalid OTP",
        });
    }
    await (0, utils_1.assertRebindProof)(user.id, secret, body.currentOtp, ctx);
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Saving OTP configuration");
    const result = await saveOTPQuery(user.id, secret, type);
    void (0, user_activity_1.recordUserActivity)({
        userId: user.id,
        type: "security.2fa_enabled",
        title: "Two-factor authentication enabled",
        description: type === "APP"
            ? "Authenticator app"
            : type === "SMS"
                ? "SMS"
                : type === "EMAIL"
                    ? "Email"
                    : String(type),
        severity: "success",
        req: data,
        metadata: { method: type },
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("OTP configuration saved successfully");
    return {
        message: "OTP configuration saved successfully",
        recoveryCodes: result.recoveryCodes,
    };
};
async function saveOTPQuery(userId, secret, type) {
    if (!secret || !type)
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Missing required parameters",
        });
    if (type === "APP" && !/^[A-Z2-7]{16,}=*$/.test(secret)) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Invalid OTP secret",
        });
    }
    const secretToStore = (0, utils_1.isEncrypted)(secret) ? secret : (0, utils_1.encrypt)(secret);
    const generateRecoveryCodes = () => {
        const codes = new Set();
        while (codes.size < 12) {
            const raw = crypto_1.default.randomBytes(6).toString("hex").toUpperCase();
            const formatted = `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`;
            codes.add(formatted);
        }
        return Array.from(codes);
    };
    const recoveryCodes = generateRecoveryCodes();
    const storedRecoveryCodes = await (0, utils_1.hashRecoveryCodes)(recoveryCodes);
    let otpDetails;
    try {
        const existingTwoFactor = await db_1.models.twoFactor.findOne({
            where: { userId },
        });
        if (existingTwoFactor) {
            await db_1.models.twoFactor.update({
                secret: secretToStore,
                type,
                enabled: true,
                recoveryCodes: JSON.stringify(storedRecoveryCodes),
            }, { where: { id: existingTwoFactor.id } });
            const updatedRecord = await db_1.models.twoFactor.findByPk(existingTwoFactor.id);
            if (!updatedRecord) {
                throw (0, error_1.createError)({
                    statusCode: 500,
                    message: "Failed to load updated OTP configuration",
                });
            }
            otpDetails = updatedRecord.get({ plain: true });
        }
        else {
            const createdRecord = await db_1.models.twoFactor.create({
                userId,
                secret: secretToStore,
                type,
                enabled: true,
                recoveryCodes: JSON.stringify(storedRecoveryCodes),
            });
            otpDetails = createdRecord.get({ plain: true });
        }
    }
    catch (e) {
        console_1.logger.error("USER", "Error saving OTP configuration", e);
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Server error",
        });
    }
    return { ...otpDetails, recoveryCodes: recoveryCodes };
}
