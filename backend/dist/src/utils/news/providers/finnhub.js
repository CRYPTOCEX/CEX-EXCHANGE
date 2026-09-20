"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.finnhubAdapter = void 0;
const http_1 = require("./http");
const constants_1 = require("./constants");
const normalise_1 = require("./normalise");
const NEWS_URL = "https://finnhub.io/api/v1/news";
const VENDOR = "Finnhub";
async function fetchCategory(category, apiKey) {
    const url = `${NEWS_URL}?category=${encodeURIComponent(category)}&token=${encodeURIComponent(apiKey)}`;
    const response = await (0, http_1.newsHttpGet)(VENDOR, url);
    if (!response.ok)
        return { ok: false, error: response.error };
    const parsed = (0, http_1.parseJsonBody)(VENDOR, response.body);
    if (!parsed.ok)
        return { ok: false, error: parsed.error };
    if (parsed.value && !Array.isArray(parsed.value) && parsed.value.error) {
        return {
            ok: false,
            error: {
                message: `${VENDOR}: ${String(parsed.value.error).slice(0, 300)}`,
                retryable: false,
            },
        };
    }
    return { ok: true, rows: Array.isArray(parsed.value) ? parsed.value : [] };
}
exports.finnhubAdapter = {
    name: "finnhub",
    requiredCredentials: constants_1.NEWS_PROVIDER_CREDENTIALS.finnhub,
    async fetch(ctx) {
        const apiKey = ctx.apiKey;
        if (!apiKey) {
            return {
                ok: false,
                error: {
                    message: "No credential is configured — paste one into the provider settings, or set APP_FINNHUB_API_KEY in the server environment",
                    retryable: false,
                },
            };
        }
        const items = [];
        let lastError = null;
        for (const category of ctx.categories) {
            if (items.length >= ctx.limit)
                break;
            const result = await fetchCategory(category, apiKey);
            if (!result.ok) {
                lastError = result.error;
                continue;
            }
            for (const row of result.rows) {
                if (items.length >= ctx.limit)
                    break;
                const item = (0, normalise_1.buildItem)({
                    externalId: row === null || row === void 0 ? void 0 : row.id,
                    publishedAt: row === null || row === void 0 ? void 0 : row.datetime,
                    headline: row === null || row === void 0 ? void 0 : row.headline,
                    summary: row === null || row === void 0 ? void 0 : row.summary,
                    url: row === null || row === void 0 ? void 0 : row.url,
                    imageUrl: row === null || row === void 0 ? void 0 : row.image,
                    category: String((row === null || row === void 0 ? void 0 : row.category) || category).slice(0, 64),
                    relatedSymbols: row === null || row === void 0 ? void 0 : row.related,
                });
                if (item)
                    items.push(item);
            }
        }
        if (items.length === 0 && lastError)
            return { ok: false, error: lastError };
        return { ok: true, items };
    },
    async test(_config, apiKey) {
        if (!apiKey) {
            return {
                valid: false,
                message: "No credential is configured. Paste one into the field above, or set APP_FINNHUB_API_KEY in .env at the project root and restart the backend.",
            };
        }
        const result = await fetchCategory("general", apiKey);
        if (!result.ok)
            return { valid: false, message: result.error.message };
        return {
            valid: true,
            sampled: result.rows.length,
            message: result.rows.length > 0
                ? `Finnhub accepted the key and returned ${result.rows.length} stories.`
                : "Finnhub accepted the key but returned no stories for the general category right now. The credential is valid.",
        };
    },
};
