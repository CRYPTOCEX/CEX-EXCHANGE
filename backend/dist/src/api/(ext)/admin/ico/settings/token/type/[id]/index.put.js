"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const error_1 = require("@b/utils/error");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "Update ICO Token Type",
    description: "Updates an existing token type configuration for ICO offerings. All required fields must be provided.",
    operationId: "updateIcoTokenType",
    tags: ["Admin", "ICO", "Settings"],
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            description: "ID of the token type to update",
            required: true,
            schema: { type: "string" },
        },
    ],
    requestBody: {
        description: "New data for the token type configuration",
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
            description: "Token type updated successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: { type: "string" },
                        },
                    },
                },
            },
        },
        400: errors_1.badRequestResponse,
        401: errors_1.unauthorizedResponse,
        404: (0, errors_1.notFoundResponse)("Token Type"),
        500: errors_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "edit.ico.settings",
    logModule: "ADMIN_ICO",
    logTitle: "Update token type",
};
exports.default = async (data) => {
    const { body, params, ctx } = data;
    const { id } = params;
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
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating token type");
    const result = await (0, query_1.updateRecord)("icoTokenType", id, {
        name,
        value,
        description,
        status: statusFlag,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Token type updated successfully");
    return result;
};
