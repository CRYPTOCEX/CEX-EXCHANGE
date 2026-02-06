"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
exports.saveOrUpdateOTP = saveOrUpdateOTP;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const utils_1 = require("./utils");
exports.metadata = {
    summary: "Saves the OTP",
    operationId: "saveOTP",
    tags: ["Auth"],
    description: "Saves the OTP secret and type for the user",
    requiresAuth: true,
    logModule: "2FA",
    logTitle: "Save 2FA settings",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        secret: {
                            type: "string",
                            description: "Generated OTP secret",
                        },
                        type: {
                            type: "string",
                            enum: ["EMAIL", "SMS", "APP"],
                            description: "Type of 2FA",
                        },
                    },
                    required: ["secret", "type"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "OTP saved successfully",
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
            throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating request data");
        validateRequestBody(body);
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Saving 2FA configuration");
        const otpDetails = await saveOrUpdateOTP(user.id, body.secret, body.type);
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`2FA settings saved for ${body.type}`);
        return {
            message: "OTP saved successfully",
            otpDetails,
        };
    }
    catch (error) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(error.message || "Failed to save OTP");
        throw error;
    }
};
function validateRequestBody(body) {
    const { secret, type } = body;
    if (!secret || !type) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Missing required parameters: 'secret' and 'type'",
        });
    }
    const validTypes = ["EMAIL", "SMS", "APP"];
    if (!validTypes.includes(type)) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `Invalid type. Must be one of: ${validTypes.join(", ")}`,
        });
    }
}
async function saveOrUpdateOTP(userId, secret, type) {
    const existingTwoFactor = await db_1.models.twoFactor.findOne({
        where: { userId },
    });
    const encryptedSecret = (0, utils_1.encrypt)(secret);
    if (existingTwoFactor) {
        return await updateTwoFactor(existingTwoFactor.id, encryptedSecret, type);
    }
    else {
        return await createTwoFactor(userId, encryptedSecret, type);
    }
}
async function updateTwoFactor(recordId, secret, type) {
    try {
        const [_, [updatedRecord]] = await db_1.models.twoFactor.update({ secret, type, enabled: true }, { where: { id: recordId }, returning: true });
        return updatedRecord;
    }
    catch (error) {
        throw (0, error_1.createError)({
            statusCode: 500,
            message: `Error updating 2FA record: ${error.message}`,
        });
    }
}
async function createTwoFactor(userId, secret, type) {
    try {
        return await db_1.models.twoFactor.create({
            userId,
            secret,
            type,
            enabled: true,
        });
    }
    catch (error) {
        throw (0, error_1.createError)({
            statusCode: 500,
            message: `Error creating 2FA record: ${error.message}`,
        });
    }
}
