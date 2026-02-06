"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
exports.getMarket = getMarket;
const redis_1 = require("@b/utils/redis");
const db_1 = require("@b/db");
const console_1 = require("@b/utils/console");
const error_1 = require("@b/utils/error");
const redis = redis_1.RedisSingleton.getInstance();
const query_1 = require("@b/utils/query");
const utils_1 = require("../utils");
exports.metadata = {
    summary: "Show Market Details",
    operationId: "showMarket",
    tags: ["Exchange", "Markets"],
    description: "Retrieves details of a specific market by ID.",
    logModule: "EXCHANGE",
    logTitle: "Get Market Details",
    parameters: [
        {
            name: "id",
            in: "path",
            required: true,
            description: "The ID of the market to retrieve.",
            schema: { type: "string" },
        },
    ],
    responses: {
        200: {
            description: "Market details",
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
        404: (0, query_1.notFoundMetadataResponse)("Market"),
        500: query_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    const { params, ctx } = data;
    const { id } = params;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Fetching market ${id}`);
    try {
        const cachedMarkets = await redis.get("exchangeMarkets");
        if (cachedMarkets) {
            const markets = JSON.parse(cachedMarkets);
            const market = markets.find((m) => m.id === id);
            if (market) {
                ctx === null || ctx === void 0 ? void 0 : ctx.success("Market retrieved from cache");
                return market;
            }
        }
    }
    catch (err) {
        console_1.logger.error("EXCHANGE", "Redis error", err);
    }
    const market = await getMarket(id);
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Market retrieved successfully");
    return market;
};
async function getMarket(id) {
    const response = await db_1.models.exchangeMarket.findOne({
        where: {
            id: id,
        },
    });
    if (!response) {
        throw (0, error_1.createError)({ statusCode: 404, message: "Market not found" });
    }
    return response.get({ plain: true });
}
