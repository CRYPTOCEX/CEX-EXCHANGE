"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
exports.getCurrency = getCurrency;
const db_1 = require("@b/db");
const redis_1 = require("@b/utils/redis");
const console_1 = require("@b/utils/console");
const error_1 = require("@b/utils/error");
const redis = redis_1.RedisSingleton.getInstance();
const query_1 = require("@b/utils/query");
const utils_1 = require("../utils");
exports.metadata = {
    summary: "Show Currency",
    operationId: "getCurrency",
    tags: ["Currencies"],
    description: "Retrieves details of a specific currency by ID.",
    logModule: "EXCHANGE",
    logTitle: "Get Currency Details",
    parameters: [
        {
            name: "id",
            in: "path",
            description: "ID of the currency to retrieve.",
            required: true,
            schema: { type: "string" },
        },
    ],
    responses: {
        200: {
            description: "Currency details",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: utils_1.baseCurrencySchema,
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Currency"),
        500: query_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    const { params, ctx } = data;
    const { id } = params;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Fetching currency ${id}`);
    try {
        const cachedCurrencies = await redis.get("exchangeCurrencies");
        if (cachedCurrencies) {
            const currencies = JSON.parse(cachedCurrencies);
            const currency = currencies.find((c) => c.id === Number(id));
            if (currency) {
                ctx === null || ctx === void 0 ? void 0 : ctx.success("Currency retrieved from cache");
                return currency;
            }
        }
    }
    catch (err) {
        console_1.logger.error("EXCHANGE", "Redis error", err);
    }
    const currency = await getCurrency(Number(id));
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Currency retrieved successfully");
    return currency;
};
async function getCurrency(id) {
    const response = await db_1.models.exchangeCurrency.findOne({
        where: {
            id: id,
            status: true,
        },
    });
    if (!response) {
        throw (0, error_1.createError)({ statusCode: 404, message: "Currency not found" });
    }
    return response.get({ plain: true });
}
