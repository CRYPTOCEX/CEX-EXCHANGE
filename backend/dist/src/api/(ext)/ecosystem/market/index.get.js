"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
const utils_1 = require("./utils");
exports.metadata = {
    summary: "Retrieves all ecosystem markets",
    description: "Fetches a list of all active markets available in the ecosystem.",
    operationId: "listEcosystemMarkets",
    tags: ["Ecosystem", "Markets"],
    logModule: "ECOSYSTEM",
    logTitle: "List ecosystem markets",
    responses: {
        200: {
            description: "Markets retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: utils_1.baseMarketSchema,
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Market"),
        500: query_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    const { ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching active ecosystem markets");
    const markets = await db_1.models.ecosystemMarket.findAll({
        where: { status: true },
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Retrieved ${(markets === null || markets === void 0 ? void 0 : markets.length) || 0} active markets`);
    return markets;
};
