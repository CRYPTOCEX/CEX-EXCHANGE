"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const error_1 = require("@b/utils/error");
const otplib_1 = require("otplib");
const query_1 = require("@b/utils/query");
const index_post_1 = require("./index.post");
exports.metadata = {
    summary: "Verifies an OTP with the provided secret and type, and saves it if valid",
    operationId: "verifyOTP",
    description: "Verifies an OTP with the provided secret and type, and saves it if valid",
    tags: ["Profile"],
    requiresAuth: true,
    logModule: "USER",
    logTitle: "Verify OTP",
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
                            description: "OTP secret",
                        },
                        type: {
                            type: "string",
                            description: "Type of OTP",
                            enum: ["EMAIL", "SMS", "APP"],
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
                                    message: {
                                        type: "string",
                                        description: "Message indicating the status of the OTP verification",
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
    const { otp, secret, type } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Verifying OTP");
    const isValid = otplib_1.authenticator.verify({ token: otp, secret });
    if (!isValid) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Invalid OTP provided");
        throw (0, error_1.createError)({ statusCode: 401, message: "Invalid OTP" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Saving OTP configuration");
    await (0, index_post_1.saveOTPQuery)(user.id, secret, type);
    ctx === null || ctx === void 0 ? void 0 : ctx.success("OTP verified and saved successfully");
    return { message: "OTP verified and saved successfully" };
};
