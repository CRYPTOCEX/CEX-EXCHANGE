"use strict";
var _a;
var _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.newsApiKey = newsApiKey;
exports.requireNewsApiKey = requireNewsApiKey;
exports.upstreamRefusal = upstreamRefusal;
exports.fetchNews = fetchNews;
exports.newsQuery = newsQuery;
const error_1 = require("@b/utils/error");
const UPSTREAM = "https://min-api.cryptocompare.com/data/v2";
const CACHE_TTL_MS = 3 * 60 * 1000;
const UPSTREAM_TIMEOUT_MS = 10000;
const store = ((_a = (_b = globalThis).__newsCache) !== null && _a !== void 0 ? _a : (_b.__newsCache = new Map()));
function newsApiKey() {
    var _a;
    const key = ((_a = process.env.APP_CRYPTOCOMPARE_API_KEY) !== null && _a !== void 0 ? _a : "").trim();
    return key.length > 0 ? key : null;
}
function requireNewsApiKey() {
    const key = newsApiKey();
    if (!key) {
        throw (0, error_1.createError)({
            statusCode: 503,
            message: "News is not configured on this deployment. Enable a provider under " +
                "Admin -> System -> News and run a sync — that feed serves the web " +
                "terminal and the app from one place. Alternatively set " +
                "APP_CRYPTOCOMPARE_API_KEY in the server environment to proxy " +
                "CryptoCompare directly.",
        });
    }
    return key;
}
function upstreamRefusal(body, shape) {
    var _a, _b;
    if (!body || typeof body !== "object")
        return { rateLimited: false };
    const payload = body;
    const declaredError = String((_a = payload.Response) !== null && _a !== void 0 ? _a : "").toLowerCase() === "error";
    const data = payload.Data;
    const shapeOk = shape === "array"
        ? Array.isArray(data)
        : data !== null && typeof data === "object" && !Array.isArray(data);
    if (!declaredError && shapeOk)
        return null;
    const message = String((_b = payload.Message) !== null && _b !== void 0 ? _b : "");
    return { rateLimited: /rate limit|too many requests/i.test(message) };
}
async function fetchNews(path, params, shape = "array") {
    const key = requireNewsApiKey();
    const search = new URLSearchParams(params);
    search.sort();
    const cacheKey = `${path}?${search.toString()}`;
    const hit = store.get(cacheKey);
    if (hit && Date.now() - hit.at < CACHE_TTL_MS)
        return hit.body;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
    let response;
    try {
        response = await fetch(`${UPSTREAM}${path}?${search.toString()}`, {
            headers: { Authorization: `Apikey ${key}` },
            signal: controller.signal,
        });
    }
    catch (error) {
        if (hit)
            return hit.body;
        throw (0, error_1.createError)({
            statusCode: 502,
            message: "The news provider could not be reached.",
        });
    }
    finally {
        clearTimeout(timer);
    }
    if (!response.ok) {
        if (hit)
            return hit.body;
        throw (0, error_1.createError)({
            statusCode: response.status === 429 ? 429 : 502,
            message: response.status === 429
                ? "The news provider is rate-limiting this deployment. Try again shortly."
                : "The news provider returned an error.",
        });
    }
    const body = await response.json();
    const refusal = upstreamRefusal(body, shape);
    if (refusal) {
        if (hit)
            return hit.body;
        throw (0, error_1.createError)({
            statusCode: refusal.rateLimited ? 429 : 502,
            message: refusal.rateLimited
                ? "The news provider is rate-limiting this deployment. Try again shortly."
                : "The news provider returned an error.",
        });
    }
    store.set(cacheKey, { at: Date.now(), body });
    return body;
}
function newsQuery(query) {
    var _a, _b, _c;
    const out = { lang: "EN" };
    const sortOrder = String((_a = query.sortOrder) !== null && _a !== void 0 ? _a : "").trim();
    if (sortOrder === "latest" || sortOrder === "popular")
        out.sortOrder = sortOrder;
    const categories = String((_b = query.categories) !== null && _b !== void 0 ? _b : "").trim();
    if (categories && /^[A-Za-z0-9_,|-]{1,120}$/.test(categories)) {
        out.categories = categories;
    }
    const limit = Number.parseInt(String((_c = query.limit) !== null && _c !== void 0 ? _c : ""), 10);
    if (Number.isFinite(limit) && limit > 0)
        out.limit = String(Math.min(limit, 100));
    return out;
}
