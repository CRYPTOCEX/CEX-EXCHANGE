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
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching token icons");
    const currencies = [
        ...new Set(markets.map((m) => m.currency)),
    ];
    const tokens = currencies.length > 0
        ? await db_1.models.ecosystemToken.findAll({
            where: { currency: currencies },
            attributes: ["currency", "icon"],
        })
        : [];
    const iconMap = new Map();
    for (const token of tokens) {
        const t = token;
        if (t.icon) {
            iconMap.set(t.currency, t.icon);
        }
    }
    const result = markets.map((market) => {
        const plain = market.get ? market.get({ plain: true }) : market;
        return {
            ...plain,
            icon: iconMap.get(plain.currency) || null,
        };
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Retrieved ${result.length} active markets`);
    return result;
};
