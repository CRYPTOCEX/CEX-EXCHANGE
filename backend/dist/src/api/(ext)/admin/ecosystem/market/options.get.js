"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const errors_1 = require("@b/utils/schema/errors");
const error_1 = require("@b/utils/error");
const db_1 = require("@b/db");
exports.metadata = {
    summary: "Retrieves ecosystem market options",
    description: "Fetches a list of active ecosystem markets formatted as options for UI selection components. Each option contains the market ID and a formatted name showing the trading pair (e.g., 'BTC / USDT').",
    operationId: "getEcosystemMarketOptions",
    tags: ["Admin", "Ecosystem", "Market"],
    requiresAuth: true,
    logModule: "ADMIN_ECO",
    logTitle: "Get market options",
    responses: {
        200: {
            description: "Ecosystem market options retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                id: {
                                    type: "string",
                                    format: "uuid",
                                    description: "Market ID",
                                },
                                name: {
                                    type: "string",
                                    description: "Formatted market name (currency / pair)",
                                },
                            },
                        },
                    },
                },
            },
        },
        401: errors_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Ecosystem Market"),
        500: errors_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    const { user, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id))
        throw (0, error_1.createError)(401, "Unauthorized");
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching active ecosystem markets");
        const ecosystemMarkets = await db_1.models.ecosystemMarket.findAll({
            where: { status: true },
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Formatting market options");
        const formatted = ecosystemMarkets.map((market) => ({
            id: market.id,
            name: `${market.currency} / ${market.pair}`,
        }));
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Market options retrieved successfully");
        return formatted;
    }
    catch (error) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(error.message);
        throw (0, error_1.createError)(500, "An error occurred while fetching ecosystem markets");
    }
};
