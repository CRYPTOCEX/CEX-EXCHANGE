"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const sequelize_1 = require("sequelize");
const db_1 = require("@b/db");
const errors_1 = require("@b/utils/schema/errors");
const html_to_text_1 = require("@b/utils/news/html-to-text");
const symbol_match_1 = require("@b/utils/news/symbol-match");
const MAX_LIMIT = 100;
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const CACHE_TTL_MS = 60000;
const cache = new Map();
exports.metadata = {
    summary: "Market news for the trading terminal",
    operationId: "listMarketNews",
    tags: ["Exchange", "News"],
    description: "Latest market-news stories, newest first. Merges provider-synced and operator-authored items; hidden rows are never returned. Public — news is market data, not account data. " +
        "SYMBOL FILTER CONTRACT: `symbol` matches the BASE asset only, against the story's headline and summary text (the provider tags nothing), and it NEVER falls back to the unfiltered feed — an asset no story mentions returns an empty array, which the caller should render as 'no stories mention X' rather than as a failure. " +
        "A row carrying operator tags (Admin -> Market News, Related Symbols) matches on the tag alone — that is how a desk note reaches a scoped feed without naming the asset in its prose, and it replaces the old rule that let EVERY untagged row through.",
    parameters: [
        {
            name: "limit",
            in: "query",
            required: false,
            schema: { type: "number" },
            description: `Max stories (default 25, max ${MAX_LIMIT})`,
        },
        {
            name: "symbol",
            in: "query",
            required: false,
            schema: { type: "string" },
            description: "Market symbol (BTC/USDT) — returns only stories that name the BASE asset by ticker or by name; may legitimately be empty",
        },
        {
            name: "category",
            in: "query",
            required: false,
            schema: { type: "string" },
            description: "Provider category filter (crypto, general)",
        },
    ],
    responses: {
        200: {
            description: "Market news retrieved successfully",
            content: {
                "application/json": {
                    schema: { type: "array", items: { type: "object" } },
                },
            },
        },
        500: errors_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    var _a, _b, _c, _d;
    const { query, ctx } = data;
    const limitRaw = Number(query.limit);
    const limit = Number.isFinite(limitRaw)
        ? Math.min(Math.max(1, Math.trunc(limitRaw)), MAX_LIMIT)
        : 25;
    const category = String(query.category || "").trim();
    const symbol = String(query.symbol || "").trim().toUpperCase();
    const matcher = symbol ? (0, symbol_match_1.buildSymbolMatcher)((0, symbol_match_1.cryptoSymbolTerms)(symbol)) : null;
    if (symbol && !matcher) {
        (_a = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _a === void 0 ? void 0 : _a.call(ctx, "Retrieved 0 news stories (no usable symbol term)");
        return [];
    }
    const cacheKey = `${limit}|${matcher ? matcher.tickers.join(",") : ""}|${category}`;
    const hit = cache.get(cacheKey);
    if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
        (_b = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _b === void 0 ? void 0 : _b.call(ctx, `Retrieved ${hit.value.length} news stories (cached)`);
        return hit.value;
    }
    const where = {
        status: true,
        publishedAt: { [sequelize_1.Op.gte]: new Date(Date.now() - MAX_AGE_MS) },
    };
    if (category)
        where.category = category;
    (_c = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _c === void 0 ? void 0 : _c.call(ctx, "Querying market news");
    const rows = await db_1.models.marketNews.findAll({
        where,
        order: [["publishedAt", "DESC"]],
        limit: matcher ? limit * 4 : limit,
        attributes: [
            "id", "publishedAt", "headline", "summary", "url", "imageUrl",
            "category", "relatedSymbols", "source",
        ],
    });
    let result = rows.map((r) => { var _a; return ({
        id: r.id,
        publishedAt: new Date(r.publishedAt).getTime(),
        headline: (_a = (0, html_to_text_1.ensurePlainText)(r.headline)) !== null && _a !== void 0 ? _a : r.headline,
        summary: (0, html_to_text_1.ensurePlainText)(r.summary),
        url: r.url,
        imageUrl: r.imageUrl,
        category: r.category,
        relatedSymbols: Array.isArray(r.relatedSymbols) ? r.relatedSymbols : [],
        source: r.source,
    }); });
    if (matcher) {
        result = result.filter((n) => matcher.matches(n)).slice(0, limit);
    }
    if (cache.size > 200)
        cache.clear();
    cache.set(cacheKey, { at: Date.now(), value: result });
    (_d = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _d === void 0 ? void 0 : _d.call(ctx, `Retrieved ${result.length} news stories`);
    return result;
};
