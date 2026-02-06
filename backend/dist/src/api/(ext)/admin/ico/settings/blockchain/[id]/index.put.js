"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const error_1 = require("@b/utils/error");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "Update ICO Blockchain Configuration",
    description: "Updates an existing blockchain configuration for ICO token offerings. All fields must be provided.",
    operationId: "updateIcoBlockchain",
    tags: ["Admin", "ICO", "Settings"],
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            description: "ID of the blockchain to update",
            required: true,
            schema: { type: "string" },
        },
    ],
    requestBody: {
        description: "New data for the blockchain configuration",
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        name: {
                            type: "string",
                            description: "The display name of the blockchain",
                        },
                        value: {
                            type: "string",
                            description: "The unique value identifier for the blockchain",
                        },
                        status: {
                            type: "boolean",
                            description: "Status flag. Defaults to true if not provided",
                        },
                    },
                    required: ["name", "value"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "Blockchain configuration updated successfully",
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
        404: (0, errors_1.notFoundResponse)("Blockchain Configuration"),
        500: errors_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "edit.ico.settings",
    logModule: "ADMIN_ICO",
    logTitle: "Update blockchain configuration",
};
exports.default = async (data) => {
    const { body, params, ctx } = data;
    const { id } = params;
    const { name, value, status } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating blockchain data");
    if (!name || !value) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Missing required fields");
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Missing required fields: name, value and description",
        });
    }
    const statusFlag = status === undefined ? true : status;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating blockchain configuration");
    const result = await (0, query_1.updateRecord)("icoBlockchain", id, {
        name,
        value,
        status: statusFlag,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Blockchain configuration updated successfully");
    return result;
};
