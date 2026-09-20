"use strict";
var _a;
var _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.__testing = void 0;
exports.feedCategories = feedCategories;
exports.localNewsEnvelope = localNewsEnvelope;
exports.localNewsArticle = localNewsArticle;
exports.resetLocalNewsCache = resetLocalNewsCache;
const sequelize_1 = require("sequelize");
const db_1 = require("@b/db");
const console_1 = require("@b/utils/console");
const html_to_text_1 = require("@b/utils/news/html-to-text");
const symbol_match_1 = require("@b/utils/news/symbol-match");
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const SNAPSHOT_SIZE = 300;
const CACHE_TTL_MS = 60000;
const TRENDING_WINDOW_MS = 48 * 60 * 60 * 1000;
const TRENDING_MIN_CORPUS = 10;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;
const state = ((_a = (_b = globalThis).__mobileNewsFeed) !== null && _a !== void 0 ? _a : (_b.__mobileNewsFeed = { snapshot: null, loading: null }));
function toStory(row) {
    var _a, _b, _c;
    const symbols = row.relatedSymbols;
    return {
        id: String(row.id),
        publishedAt: new Date(row.publishedAt).getTime(),
        headline: (_a = (0, html_to_text_1.ensurePlainText)(row.headline)) !== null && _a !== void 0 ? _a : String((_b = row.headline) !== null && _b !== void 0 ? _b : ""),
        summary: (_c = (0, html_to_text_1.ensurePlainText)(row.summary)) !== null && _c !== void 0 ? _c : "",
        url: row.url ? String(row.url) : "",
        imageUrl: row.imageUrl ? String(row.imageUrl) : "",
        category: row.category ? String(row.category) : "",
        relatedSymbols: Array.isArray(symbols) ? symbols.map(String) : [],
        provider: row.provider ? String(row.provider) : "",
    };
}
async function loadSnapshot() {
    let rows = [];
    try {
        rows = (await db_1.models.marketNews.findAll({
            where: {
                status: true,
                publishedAt: { [sequelize_1.Op.gte]: new Date(Date.now() - MAX_AGE_MS) },
            },
            order: [["publishedAt", "DESC"]],
            limit: SNAPSHOT_SIZE,
            attributes: [
                "id",
                "publishedAt",
                "headline",
                "summary",
                "url",
                "imageUrl",
                "category",
                "relatedSymbols",
                "provider",
            ],
        }));
    }
    catch (error) {
        console_1.logger.warn("NEWS", `Could not read market_news for the app feed, falling back to the news proxy: ${error === null || error === void 0 ? void 0 : error.message}`);
    }
    const snapshot = {
        at: Date.now(),
        latest: rows.map(toStory),
        trending: null,
    };
    state.snapshot = snapshot;
    return snapshot;
}
async function getSnapshot() {
    const current = state.snapshot;
    if (current && Date.now() - current.at < CACHE_TTL_MS)
        return current;
    if (state.loading)
        return state.loading;
    state.loading = loadSnapshot().finally(() => {
        state.loading = null;
    });
    return state.loading;
}
function trendingOrder(latest) {
    var _a;
    const cutoff = Date.now() - TRENDING_WINDOW_MS;
    const recent = latest.filter((story) => story.publishedAt >= cutoff);
    const corpus = recent.length >= TRENDING_MIN_CORPUS ? recent : latest;
    const matchers = [];
    for (const ticker of Object.keys(symbol_match_1.ASSET_NAMES)) {
        const matcher = (0, symbol_match_1.buildSymbolMatcher)((0, symbol_match_1.cryptoSymbolTerms)(ticker));
        if (matcher)
            matchers.push([ticker, matcher]);
    }
    const mentions = new Map();
    const counts = new Map();
    for (const story of corpus) {
        const hits = [];
        for (const [ticker, matcher] of matchers) {
            if (!matcher.matches(story))
                continue;
            hits.push(ticker);
            counts.set(ticker, ((_a = counts.get(ticker)) !== null && _a !== void 0 ? _a : 0) + 1);
        }
        if (hits.length > 0)
            mentions.set(story.id, hits);
    }
    return corpus
        .map((story) => {
        var _a, _b;
        let score = 0;
        for (const ticker of (_a = mentions.get(story.id)) !== null && _a !== void 0 ? _a : []) {
            score = Math.max(score, (_b = counts.get(ticker)) !== null && _b !== void 0 ? _b : 0);
        }
        return { story, score };
    })
        .sort((a, b) => b.score - a.score || b.story.publishedAt - a.story.publishedAt)
        .map((entry) => entry.story);
}
function categoryFilter(terms) {
    const literals = new Set(terms.map((term) => term.toLowerCase()));
    const matchers = terms
        .map((term) => (0, symbol_match_1.buildSymbolMatcher)((0, symbol_match_1.cryptoSymbolTerms)(term)))
        .filter((matcher) => matcher !== null);
    return (story) => {
        if (story.category && literals.has(story.category.toLowerCase()))
            return true;
        return matchers.some((matcher) => matcher.matches(story));
    };
}
function publisherOf(story) {
    if (story.url) {
        try {
            const host = new URL(story.url).hostname.replace(/^www\./i, "");
            if (host)
                return host;
        }
        catch (_a) {
        }
    }
    return story.provider;
}
function toEnvelopeItem(story) {
    const publisher = publisherOf(story);
    return {
        id: story.id,
        guid: story.url || story.id,
        published_on: Math.floor(story.publishedAt / 1000),
        imageurl: story.imageUrl,
        title: story.headline,
        url: story.url,
        body: story.summary,
        tags: "",
        lang: "EN",
        categories: [story.category, ...story.relatedSymbols].filter(Boolean).join("|"),
        source: publisher,
        source_info: { name: publisher, lang: "EN", img: "" },
    };
}
function feedCategories(raw) {
    return String(raw !== null && raw !== void 0 ? raw : "")
        .split(/[,|]/)
        .map((term) => term.trim())
        .filter((term) => term.length > 0 && term.length <= 64)
        .slice(0, 10);
}
function clampInt(raw, fallback, min, max) {
    const value = Number.parseInt(String(raw !== null && raw !== void 0 ? raw : ""), 10);
    if (!Number.isFinite(value))
        return fallback;
    return Math.min(Math.max(value, min), max);
}
async function localNewsEnvelope(query) {
    var _a;
    const snapshot = await getSnapshot();
    if (snapshot.latest.length === 0)
        return null;
    let stories;
    if (String((_a = query.sortOrder) !== null && _a !== void 0 ? _a : "") === "popular") {
        if (!snapshot.trending)
            snapshot.trending = trendingOrder(snapshot.latest);
        stories = snapshot.trending;
    }
    else {
        stories = snapshot.latest;
    }
    const terms = feedCategories(query.categories);
    if (terms.length > 0)
        stories = stories.filter(categoryFilter(terms));
    const offset = clampInt(query.offset, 0, 0, SNAPSHOT_SIZE);
    const limit = clampInt(query.limit, DEFAULT_LIMIT, 1, MAX_LIMIT);
    const page = stories.slice(offset, offset + limit);
    return {
        Type: 100,
        Message: "News list successfully returned",
        Data: page.map(toEnvelopeItem),
    };
}
async function localNewsArticle(id) {
    const snapshot = await getSnapshot();
    const cached = snapshot.latest.find((story) => story.id === id);
    if (cached)
        return { Data: toEnvelopeItem(cached) };
    try {
        const row = await db_1.models.marketNews.findOne({
            where: { id, status: true },
            attributes: [
                "id",
                "publishedAt",
                "headline",
                "summary",
                "url",
                "imageUrl",
                "category",
                "relatedSymbols",
                "provider",
            ],
        });
        if (!row)
            return null;
        return { Data: toEnvelopeItem(toStory(row)) };
    }
    catch (_a) {
        return null;
    }
}
function resetLocalNewsCache() {
    state.snapshot = null;
    state.loading = null;
}
exports.__testing = {
    categoryFilter,
    toEnvelopeItem,
    trendingOrder,
    publisherOf,
    SNAPSHOT_SIZE,
};
