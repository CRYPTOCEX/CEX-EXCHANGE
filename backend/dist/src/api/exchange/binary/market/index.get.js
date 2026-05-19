"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "List Binary Markets",
    operationId: "listBinaryMarkets",
    tags: ["Exchange", "Binary", "Markets"],
    description: "Retrieves a list of all available binary trading markets.",
    logModule: "EXCHANGE",
    logTitle: "Get Binary Markets",
    responses: {
        200: {
            description: "A list of binary markets",
            content: {
                "application/json": {
                    schema: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                id: {
                                    type: "string",
                                    description: "Market ID",
                                },
                                currency: {
                                    type: "string",
                                    description: "Base currency",
                                },
                                pair: {
                                    type: "string",
                                    description: "Quote currency",
                                },
                                isTrending: {
                                    type: "boolean",
                                    description: "Whether the market is trending",
                                },
                                isHot: {
                                    type: "boolean",
                                    description: "Whether the market is hot",
                                },
                                status: {
                                    type: "boolean",
                                    description: "Market status",
                                },
                            },
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Binary Market"),
        500: query_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    const { ctx } = data;
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching binary markets");
        const binaryMarkets = await db_1.models.binaryMarket.findAll({
            where: {
                status: true,
            },
            order: [
                ['isTrending', 'DESC'],
                ['isHot', 'DESC'],
                ['currency', 'ASC'],
            ],
        });
        const markets = binaryMarkets.map((market) => ({
            ...market.get({ plain: true }),
            label: `${market.currency}/${market.pair}`,
            symbol: `${market.currency}/${market.pair}`,
        }));
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`Retrieved ${markets.length} binary markets`);
        return markets;
    }
    catch (error) {
        console.error("Error fetching binary markets:", error);
        throw error;
    }
};
