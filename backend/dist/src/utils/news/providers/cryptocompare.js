"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cryptocompareAdapter = void 0;
const http_1 = require("./http");
const constants_1 = require("./constants");
const normalise_1 = require("./normalise");
const NEWS_URL = "https://min-api.cryptocompare.com/data/v2/news/";
const VENDOR = "CryptoCompare";
function assetTags(raw) {
    return String(raw !== null && raw !== void 0 ? raw : "")
        .split("|")
        .map((part) => part.trim())
        .filter((part) => /^[A-Z0-9]{2,6}$/.test(part));
}
async function request(categories, apiKey) {
    const params = new URLSearchParams({ lang: "EN", sortOrder: "latest" });
    const filter = categories.filter(Boolean).join(",");
    if (filter)
        params.set("categories", filter);
    const response = await (0, http_1.newsHttpGet)(VENDOR, `${NEWS_URL}?${params.toString()}`, {
        headers: { Authorization: `Apikey ${apiKey}` },
    });
    if (!response.ok)
        return { ok: false, error: response.error };
    const parsed = (0, http_1.parseJsonBody)(VENDOR, response.body);
    if (!parsed.ok)
        return { ok: false, error: parsed.error };
    const payload = parsed.value;
    if ((payload === null || payload === void 0 ? void 0 : payload.Response) === "Error") {
        const message = String((payload === null || payload === void 0 ? void 0 : payload.Message) || "request rejected").slice(0, 300);
        return {
            ok: false,
            error: {
                message: `${VENDOR}: ${message}`,
                retryable: /rate limit|too many/i.test(message),
            },
        };
    }
    return { ok: true, rows: Array.isArray(payload === null || payload === void 0 ? void 0 : payload.Data) ? payload.Data : [] };
}
exports.cryptocompareAdapter = {
    name: "cryptocompare",
    requiredCredentials: constants_1.NEWS_PROVIDER_CREDENTIALS.cryptocompare,
    async fetch(ctx) {
        var _a;
        const apiKey = ctx.apiKey;
        if (!apiKey) {
            return {
                ok: false,
                error: {
                    message: "No credential is configured — paste one into the provider settings, or set APP_CRYPTOCOMPARE_API_KEY in the server environment",
                    retryable: false,
                },
            };
        }
        const result = await request(ctx.categories, apiKey);
        if (!result.ok)
            return { ok: false, error: result.error };
        const items = [];
        for (const row of result.rows) {
            if (items.length >= ctx.limit)
                break;
            const tags = assetTags(row === null || row === void 0 ? void 0 : row.categories);
            const item = (0, normalise_1.buildItem)({
                externalId: row === null || row === void 0 ? void 0 : row.id,
                publishedAt: row === null || row === void 0 ? void 0 : row.published_on,
                headline: row === null || row === void 0 ? void 0 : row.title,
                summary: row === null || row === void 0 ? void 0 : row.body,
                url: row === null || row === void 0 ? void 0 : row.url,
                imageUrl: row === null || row === void 0 ? void 0 : row.imageurl,
                category: String(((_a = row === null || row === void 0 ? void 0 : row.source_info) === null || _a === void 0 ? void 0 : _a.name) || "crypto").slice(0, 64),
                relatedSymbols: tags,
            });
            if (item)
                items.push(item);
        }
        return { ok: true, items };
    },
    async test(_config, apiKey) {
        if (!apiKey) {
            return {
                valid: false,
                message: "No credential is configured. Paste one into the field above, or set APP_CRYPTOCOMPARE_API_KEY in .env at the project root and restart the backend.",
            };
        }
        const result = await request([], apiKey);
        if (!result.ok)
            return { valid: false, message: result.error.message };
        return {
            valid: true,
            sampled: result.rows.length,
            message: result.rows.length > 0
                ? `CryptoCompare accepted the key and returned ${result.rows.length} stories.`
                : "CryptoCompare accepted the key but returned no stories right now. The credential is valid.",
        };
    },
};
