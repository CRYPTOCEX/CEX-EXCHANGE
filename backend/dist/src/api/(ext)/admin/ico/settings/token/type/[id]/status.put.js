"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const error_1 = require("@b/utils/error");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "Update ICO Token Type Status",
    description: "Updates only the status field of a token type configuration. Used to enable or disable token types for ICO offerings.",
    operationId: "updateIcoTokenTypeStatus",
    tags: ["Admin", "ICO", "Settings"],
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            description: "ID of the token type to update status",
            required: true,
            schema: { type: "string" },
        },
    ],
    requestBody: {
        description: "New status for the token type configuration",
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        status: {
                            type: "boolean",
                            description: "Token type status",
                        },
                    },
                    required: ["status"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "Token type status updated successfully",
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
    logTitle: "Update token type status",
};
exports.default = async (data) => {
    const { body, params, ctx } = data;
    const { id } = params;
    const { status } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating status field");
    if (status === undefined) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Missing required field: status");
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Missing required field: status",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating token type status");
    const result = await (0, query_1.updateRecord)("icoTokenType", id, { status });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Token type status updated successfully");
    return result;
};
