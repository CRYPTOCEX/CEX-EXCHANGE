"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
const cache_1 = require("@b/utils/cache");
exports.metadata = {
    summary: "Lists all MLM Referral Conditions with pagination and optional filtering",
    operationId: "listMlmReferralConditions",
    tags: ["MLM", "Referral Conditions"],
    logModule: "AFFILIATE",
    logTitle: "List affiliate conditions",
    responses: {
        200: {
            description: "List of MLM Referral Conditions with pagination information",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            data: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        id: { type: "number" },
                                        title: { type: "string" },
                                        description: { type: "string" },
                                        reward: { type: "number" },
                                        reward_type: { type: "string" },
                                        reward_currency: { type: "string" },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("MLM Referral Conditions"),
        500: query_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    const { ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching active referral conditions");
    const conditions = await db_1.models.mlmReferralCondition.findAll({
        where: { status: true },
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Loading extension availability from cache");
    const conditionExtensionMap = new Map();
    const cacheManager = cache_1.CacheManager.getInstance();
    const extensions = await cacheManager.getExtensions();
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Mapping conditions to extensions");
    conditions.forEach((condition) => {
        const conditionMapping = {
            STAKING_LOYALTY: "staking",
            P2P_TRADE: "p2p",
            AI_INVESTMENT: "ai_investment",
            ICO_CONTRIBUTION: "ico",
            FOREX_INVESTMENT: "forex",
            ECOMMERCE_PURCHASE: "ecommerce",
        };
        if (conditionMapping[condition.name]) {
            conditionExtensionMap.set(condition.name, extensions.has(conditionMapping[condition.name]));
        }
        else {
            conditionExtensionMap.set(condition.name, true);
        }
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Filtering conditions based on available extensions");
    const filteredConditions = conditions.filter((condition) => {
        return conditionExtensionMap.get(condition.name);
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Retrieved ${filteredConditions.length} active affiliate conditions`);
    return filteredConditions;
};
