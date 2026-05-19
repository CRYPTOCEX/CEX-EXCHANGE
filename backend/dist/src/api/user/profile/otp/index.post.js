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
                    },
                    required: ["secret", "type"],
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
    const { secret, type } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Saving OTP configuration");
    const result = await saveOTPQuery(user.id, secret, type);
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
    let otpDetails;
    try {
        const existingTwoFactor = await db_1.models.twoFactor.findOne({
            where: { userId },
        });
        if (existingTwoFactor) {
            const [_, [updatedRecord]] = await db_1.models.twoFactor.update({
                secret,
                type,
                enabled: true,
                recoveryCodes: JSON.stringify(recoveryCodes),
            }, { where: { id: existingTwoFactor.id }, returning: true });
            otpDetails = updatedRecord.get({ plain: true });
        }
        else {
            const createdRecord = await db_1.models.twoFactor.create({
                userId,
                secret,
                type,
                enabled: true,
                recoveryCodes: JSON.stringify(recoveryCodes),
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
