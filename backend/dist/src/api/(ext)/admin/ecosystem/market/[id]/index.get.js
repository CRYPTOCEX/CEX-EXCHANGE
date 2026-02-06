"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const utils_1 = require("@b/api/exchange/market/utils");
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Retrieves a specific ecosystem market",
    description: "Fetches detailed information for a single ecosystem market by its ID, including currency, pair, trading status, trending/hot indicators, and metadata containing precision, limits, and fee information.",
    operationId: "getEcosystemMarket",
    tags: ["Admin", "Ecosystem", "Market"],
    logModule: "ADMIN_ECO",
    logTitle: "Get market details",
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            description: "ID of the ecosystem market to retrieve",
            schema: { type: "string", format: "uuid" },
        },
    ],
    responses: {
        200: {
            description: "Ecosystem market details retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: utils_1.baseMarketSchema,
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Ecosystem Market"),
        500: query_1.serverErrorResponse,
    },
    permission: "view.ecosystem.market",
    requiresAuth: true,
};
exports.default = async (data) => {
    const { params, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Retrieving market details");
    const market = await db_1.models.ecosystemMarket.findOne({
        where: { id: params.id },
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Market details retrieved");
    return market;
};
