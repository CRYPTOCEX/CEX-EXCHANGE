"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const utils_1 = require("./utils");
const db_1 = require("@b/db");
const redis_1 = require("@b/utils/redis");
const sequelize_1 = require("sequelize");
const redis = redis_1.RedisSingleton.getInstance();
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "List Exchange Markets",
    operationId: "listMarkets",
    tags: ["Exchange", "Markets"],
    description: "Retrieves a list of all available markets.",
    parameters: [
        {
            name: "eco",
            in: "query",
            required: true,
            description: "include eco",
            schema: { type: "string" },
        },
    ],
    responses: {
        200: {
            description: "A list of markets",
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
const CACHE_KEY_PREFIX = "ecosystem_token_icon:";
const CACHE_EXPIRY = 3600;
async function getTokenIconFromCache(currency) {
    const cacheKey = `${CACHE_KEY_PREFIX}${currency}`;
    const cachedIcon = await redis.get(cacheKey);
    return cachedIcon;
}
async function setTokenIconInCache(currency, icon) {
    const cacheKey = `${CACHE_KEY_PREFIX}${currency}`;
    await redis.set(cacheKey, icon, "EX", CACHE_EXPIRY);
}
exports.default = async (data) => {
    const { query, ctx } = data;
    const { eco } = query;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching exchange markets");
    const exchangeMarkets = await db_1.models.exchangeMarket.findAll({
        where: {
            status: true,
        },
    });
    let ecosystemMarkets = [];
    if (eco === "true") {
        ecosystemMarkets = await db_1.models.ecosystemMarket.findAll({
            where: {
                status: true,
            },
        });
        const currencies = Array.from(new Set(ecosystemMarkets
            .map((market) => market.currency)
            .filter((currency) => currency !== undefined)));
        const tokenMap = {};
        const missingCurrencies = [];
        for (const currency of currencies) {
            const cachedIcon = await getTokenIconFromCache(currency);
            if (cachedIcon !== null) {
                tokenMap[currency] = cachedIcon;
            }
            else {
                missingCurrencies.push(currency);
            }
        }
        if (missingCurrencies.length > 0) {
            const tokens = await db_1.models.ecosystemToken.findAll({
                where: {
                    currency: {
                        [sequelize_1.Op.in]: missingCurrencies,
                    },
                },
            });
            for (const token of tokens) {
                if (token.currency && token.icon) {
                    tokenMap[token.currency] = token.icon;
                    await setTokenIconInCache(token.currency, token.icon);
                }
            }
        }
        ecosystemMarkets = ecosystemMarkets.map((market) => {
            const icon = market.currency ? tokenMap[market.currency] || null : null;
            return {
                ...market.get({ plain: true }),
                icon,
                isEco: true,
            };
        });
    }
    const markets = [
        ...exchangeMarkets.map((market) => ({
            ...market.get({ plain: true }),
            symbol: `${market.currency}/${market.pair}`,
            isEco: false,
        })),
        ...ecosystemMarkets.map((market) => ({
            ...market,
            symbol: `${market.currency}/${market.pair}`,
        })),
    ];
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Retrieved ${markets.length} markets (${exchangeMarkets.length} exchange, ${ecosystemMarkets.length} ecosystem)`);
    return markets;
};
