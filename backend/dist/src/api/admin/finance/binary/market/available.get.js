"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Get Available Markets for Binary Trading",
    operationId: "getAvailableMarketsForBinary",
    tags: ["Admin", "Binary", "Markets"],
    description: "Returns available markets from exchange and ecosystem that can be added as binary markets.",
    parameters: [
        {
            name: "source",
            in: "query",
            description: "Market source: 'exchange' or 'ecosystem'",
            schema: { type: "string", enum: ["exchange", "ecosystem"] },
        },
    ],
    requiresAuth: true,
    responses: {
        200: {
            description: "Available markets retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            exchangeMarkets: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        id: { type: "string" },
                                        currency: { type: "string" },
                                        pair: { type: "string" },
                                        symbol: { type: "string" },
                                        hasAiMarketMaker: { type: "boolean" },
                                        hasBinaryAiEngine: { type: "boolean" },
                                    },
                                },
                            },
                            ecosystemMarkets: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        id: { type: "string" },
                                        currency: { type: "string" },
                                        pair: { type: "string" },
                                        symbol: { type: "string" },
                                        hasAiMarketMaker: { type: "boolean" },
                                        hasBinaryAiEngine: { type: "boolean" },
                                        aiMarketMakerId: { type: "string", nullable: true },
                                    },
                                },
                            },
                            existingBinaryMarkets: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        currency: { type: "string" },
                                        pair: { type: "string" },
                                    },
                                },
                            },
                            binarySettings: {
                                type: "object",
                                properties: {
                                    isRiseFallOnly: { type: "boolean" },
                                    orderTypes: { type: "object" },
                                },
                            },
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        500: query_1.serverErrorResponse,
    },
    permission: "view.binary.market",
};
exports.default = async (data) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
    const { query } = data;
    const source = query === null || query === void 0 ? void 0 : query.source;
    const existingBinaryMarkets = await db_1.models.binaryMarket.findAll({
        attributes: ["currency", "pair"],
    });
    const existingPairs = new Set(existingBinaryMarkets.map((m) => `${m.currency}/${m.pair}`));
    let aiMarketMakers = [];
    if (db_1.models.aiMarketMaker) {
        const results = await db_1.models.aiMarketMaker.findAll({
            attributes: ["id", "marketId", "status"],
        });
        aiMarketMakers = results.map((mm) => ({
            id: mm.id,
            marketId: mm.marketId,
            status: mm.status,
        }));
    }
    let binaryAiEngines = [];
    if (db_1.models.binaryAiEngine) {
        const results = await db_1.models.binaryAiEngine.findAll({
            attributes: ["id", "marketMakerId", "status", "allowedOrderTypes"],
        });
        binaryAiEngines = results.map((e) => ({
            id: e.id,
            marketMakerId: e.marketMakerId,
            status: e.status,
            allowedOrderTypes: e.allowedOrderTypes,
        }));
    }
    const aiMarketMakerByMarketId = new Map(aiMarketMakers.map((mm) => [mm.marketId, mm]));
    const binaryEngineByMarketMakerId = new Map(binaryAiEngines.map((e) => [e.marketMakerId, e]));
    let binarySettings = null;
    try {
        const settingsRecord = await ((_a = db_1.models.settings) === null || _a === void 0 ? void 0 : _a.findOne({
            where: { key: "binarySettings" },
        }));
        if (settingsRecord === null || settingsRecord === void 0 ? void 0 : settingsRecord.value) {
            binarySettings = JSON.parse(settingsRecord.value);
        }
    }
    catch (e) {
    }
    const isRiseFallOnly = ((_c = (_b = binarySettings === null || binarySettings === void 0 ? void 0 : binarySettings.orderTypes) === null || _b === void 0 ? void 0 : _b.RISE_FALL) === null || _c === void 0 ? void 0 : _c.enabled) === true &&
        !((_e = (_d = binarySettings === null || binarySettings === void 0 ? void 0 : binarySettings.orderTypes) === null || _d === void 0 ? void 0 : _d.HIGHER_LOWER) === null || _e === void 0 ? void 0 : _e.enabled) &&
        !((_g = (_f = binarySettings === null || binarySettings === void 0 ? void 0 : binarySettings.orderTypes) === null || _f === void 0 ? void 0 : _f.TOUCH_NO_TOUCH) === null || _g === void 0 ? void 0 : _g.enabled) &&
        !((_j = (_h = binarySettings === null || binarySettings === void 0 ? void 0 : binarySettings.orderTypes) === null || _h === void 0 ? void 0 : _h.CALL_PUT) === null || _j === void 0 ? void 0 : _j.enabled) &&
        !((_l = (_k = binarySettings === null || binarySettings === void 0 ? void 0 : binarySettings.orderTypes) === null || _k === void 0 ? void 0 : _k.TURBO) === null || _l === void 0 ? void 0 : _l.enabled);
    const result = {
        exchangeMarkets: [],
        ecosystemMarkets: [],
        existingBinaryMarkets: existingBinaryMarkets.map((m) => ({
            currency: m.currency,
            pair: m.pair,
        })),
        binarySettings: {
            isRiseFallOnly,
            orderTypes: (binarySettings === null || binarySettings === void 0 ? void 0 : binarySettings.orderTypes) || {},
        },
    };
    if (!source || source === "exchange") {
        const exchangeMarkets = await db_1.models.exchangeMarket.findAll({
            where: { status: true },
            attributes: ["id", "currency", "pair"],
            order: [["currency", "ASC"], ["pair", "ASC"]],
        });
        result.exchangeMarkets = exchangeMarkets
            .filter((m) => !existingPairs.has(`${m.currency}/${m.pair}`))
            .map((m) => ({
            id: m.id,
            currency: m.currency,
            pair: m.pair,
            symbol: `${m.currency}/${m.pair}`,
            hasAiMarketMaker: false,
            hasBinaryAiEngine: false,
        }));
    }
    if (!source || source === "ecosystem") {
        const ecosystemMarkets = await ((_m = db_1.models.ecosystemMarket) === null || _m === void 0 ? void 0 : _m.findAll({
            where: { status: true },
            attributes: ["id", "currency", "pair"],
            order: [["currency", "ASC"], ["pair", "ASC"]],
        })) || [];
        result.ecosystemMarkets = ecosystemMarkets
            .filter((m) => !existingPairs.has(`${m.currency}/${m.pair}`))
            .map((m) => {
            const aiMM = aiMarketMakerByMarketId.get(m.id);
            const binaryEngine = aiMM ? binaryEngineByMarketMakerId.get(aiMM.id) : null;
            return {
                id: m.id,
                currency: m.currency,
                pair: m.pair,
                symbol: `${m.currency}/${m.pair}`,
                hasAiMarketMaker: !!aiMM,
                hasBinaryAiEngine: !!binaryEngine,
                aiMarketMakerId: (aiMM === null || aiMM === void 0 ? void 0 : aiMM.id) || null,
                aiMarketMakerStatus: (aiMM === null || aiMM === void 0 ? void 0 : aiMM.status) || null,
                binaryAiEngineStatus: (binaryEngine === null || binaryEngine === void 0 ? void 0 : binaryEngine.status) || null,
            };
        });
    }
    return result;
};
