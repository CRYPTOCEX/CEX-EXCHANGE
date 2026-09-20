"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cryptopanicAdapter = void 0;
const http_1 = require("./http");
const constants_1 = require("./constants");
const normalise_1 = require("./normalise");
const POSTS_URL = "https://cryptopanic.com/api/developer/v2/posts/";
const VENDOR = "CryptoPanic";
function instrumentCodes(row) {
    const raw = Array.isArray(row === null || row === void 0 ? void 0 : row.instruments)
        ? row.instruments
        : Array.isArray(row === null || row === void 0 ? void 0 : row.currencies)
            ? row.currencies
            : [];
    return raw
        .map((entry) => { var _a; return String((_a = entry === null || entry === void 0 ? void 0 : entry.code) !== null && _a !== void 0 ? _a : "").trim().toUpperCase(); })
        .filter(Boolean);
}
async function request(ctx, apiKey) {
    var _a, _b;
    var _c, _d;
    const params = new URLSearchParams({ auth_token: apiKey });
    const currencies = ctx.categories.filter(Boolean).join(",");
    if (currencies)
        params.set("currencies", currencies);
    const filter = String((_c = (_a = ctx.config) === null || _a === void 0 ? void 0 : _a.filter) !== null && _c !== void 0 ? _c : "").trim();
    if (filter && constants_1.CRYPTOPANIC_FILTERS.includes(filter))
        params.set("filter", filter);
    const kind = String((_d = (_b = ctx.config) === null || _b === void 0 ? void 0 : _b.kind) !== null && _d !== void 0 ? _d : "").trim();
    if (kind === "news" || kind === "media")
        params.set("kind", kind);
    const response = await (0, http_1.newsHttpGet)(VENDOR, `${POSTS_URL}?${params.toString()}`);
    if (!response.ok)
        return { ok: false, error: response.error };
    const parsed = (0, http_1.parseJsonBody)(VENDOR, response.body);
    if (!parsed.ok)
        return { ok: false, error: parsed.error };
    const payload = parsed.value;
    if ((payload === null || payload === void 0 ? void 0 : payload.status) && payload.status !== "OK") {
        const info = String((payload === null || payload === void 0 ? void 0 : payload.info) || payload.status).slice(0, 300);
        return {
            ok: false,
            error: {
                message: `${VENDOR}: ${info}`,
                retryable: /rate|limit|throttl/i.test(info),
            },
        };
    }
    return { ok: true, rows: Array.isArray(payload === null || payload === void 0 ? void 0 : payload.results) ? payload.results : [] };
}
exports.cryptopanicAdapter = {
    name: "cryptopanic",
    requiredCredentials: constants_1.NEWS_PROVIDER_CREDENTIALS.cryptopanic,
    async fetch(ctx) {
        var _a;
        const apiKey = ctx.apiKey;
        if (!apiKey) {
            return {
                ok: false,
                error: {
                    message: "No credential is configured — paste one into the provider settings, or set APP_CRYPTOPANIC_API_KEY in the server environment",
                    retryable: false,
                },
            };
        }
        const result = await request(ctx, apiKey);
        if (!result.ok)
            return { ok: false, error: result.error };
        const items = [];
        for (const row of result.rows) {
            if (items.length >= ctx.limit)
                break;
            const item = (0, normalise_1.buildItem)({
                externalId: row === null || row === void 0 ? void 0 : row.id,
                publishedAt: (_a = row === null || row === void 0 ? void 0 : row.published_at) !== null && _a !== void 0 ? _a : row === null || row === void 0 ? void 0 : row.created_at,
                headline: row === null || row === void 0 ? void 0 : row.title,
                summary: row === null || row === void 0 ? void 0 : row.description,
                url: (row === null || row === void 0 ? void 0 : row.original_url) || (row === null || row === void 0 ? void 0 : row.url),
                imageUrl: undefined,
                category: "crypto",
                relatedSymbols: instrumentCodes(row),
            });
            if (item)
                items.push(item);
        }
        return { ok: true, items };
    },
    async test(config, apiKey) {
        if (!apiKey) {
            return {
                valid: false,
                message: "No credential is configured. Paste one into the field above, or set APP_CRYPTOPANIC_API_KEY in .env at the project root and restart the backend.",
            };
        }
        const result = await request({ categories: [], config }, apiKey);
        if (!result.ok)
            return { valid: false, message: result.error.message };
        const tagged = result.rows.filter((row) => instrumentCodes(row).length > 0).length;
        return {
            valid: true,
            sampled: result.rows.length,
            message: result.rows.length > 0
                ? `CryptoPanic accepted the token and returned ${result.rows.length} posts, ${tagged} of them carrying instrument tags.`
                : "CryptoPanic accepted the token but returned no posts right now. The credential is valid.",
        };
    },
};
