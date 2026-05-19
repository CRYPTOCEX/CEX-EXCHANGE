"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "Create ICO Token Type",
    description: "Creates a new token type configuration for ICO offerings. Token types define the category of tokens (e.g., ERC-20, BEP-20, utility, security).",
    operationId: "createIcoTokenType",
    tags: ["Admin", "ICO", "Settings"],
    requiresAuth: true,
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        name: {
                            type: "string",
                            description: "The display name of the token type",
                        },
                        value: {
                            type: "string",
                            description: "The unique value identifier for the token type",
                        },
                        description: {
                            type: "string",
                            description: "A description of the token type",
                        },
                        status: {
                            type: "boolean",
                            description: "Status flag. Defaults to true if not provided",
                        },
                    },
                    required: ["name", "value", "description"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "Token type configuration created successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: { type: "string" },
                            tokenType: {
                                type: "object",
                                description: "The created token type",
                            },
                        },
                    },
                },
            },
        },
        400: errors_1.badRequestResponse,
        401: errors_1.unauthorizedResponse,
        500: errors_1.serverErrorResponse,
    },
    permission: "edit.ico.settings",
    logModule: "ADMIN_ICO",
    logTitle: "Create token type",
};
exports.default = async (data) => {
    const { user, body, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating user permissions");
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Unauthorized access");
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const { name, value, description, status } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating token type data");
    if (!name || !value || !description) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Missing required fields");
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Missing required fields: name, value and description",
        });
    }
    const statusFlag = status === undefined ? true : status;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating token type");
    const tokenType = await db_1.models.icoTokenType.create({
        name,
        value,
        description,
        status: statusFlag,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Token type created successfully");
    return {
        message: "Token type configuration created successfully.",
        tokenType,
    };
};
