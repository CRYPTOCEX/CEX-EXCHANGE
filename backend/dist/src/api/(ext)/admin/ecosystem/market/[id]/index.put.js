"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const utils_1 = require("@b/api/admin/finance/exchange/market/utils");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "Updates a specific ecosystem market",
    description: "Updates the metadata of an existing ecosystem market. This endpoint allows modification of market configuration including precision settings, trading limits, and fee structures.",
    operationId: "updateEcosystemMarket",
    tags: ["Admin", "Ecosystem", "Market"],
    logModule: "ADMIN_ECO",
    logTitle: "Update market",
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            description: "ID of the ecosystem market to update",
            required: true,
            schema: {
                type: "string",
                format: "uuid",
            },
        },
    ],
    requestBody: {
        description: "New metadata for the market",
        content: {
            "application/json": {
                schema: utils_1.MarketUpdateSchema,
            },
        },
    },
    responses: {
        200: {
            description: "Market updated successfully",
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
        400: errors_1.badRequestResponse,
        401: errors_1.unauthorizedResponse,
        404: (0, errors_1.notFoundResponse)("Ecosystem Market"),
        500: errors_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "edit.ecosystem.market",
};
exports.default = async (data) => {
    const { body, params, ctx } = data;
    const { id } = params;
    const { metadata } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating market record");
    const result = await (0, query_1.updateRecord)("ecosystemMarket", id, {
        metadata,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Market updated successfully");
    return result;
};
