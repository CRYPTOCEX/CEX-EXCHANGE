"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateCategories = validateCategories;
exports.validateNewsProviderConfig = validateNewsProviderConfig;
exports.validateBoundedInt = validateBoundedInt;
exports.readProviderConfig = readProviderConfig;
exports.validateProviderApiKey = validateProviderApiKey;
const error_1 = require("@b/utils/error");
const constants_1 = require("./constants");
const coerce_1 = require("./coerce");
function validateCategories(raw) {
    if (raw === null || raw === undefined || raw === "")
        return null;
    const list = Array.isArray(raw) ? raw : String(raw).split(",");
    const cleaned = list
        .map((entry) => String(entry).trim())
        .filter(Boolean)
        .filter((entry) => entry.length <= 64);
    if (cleaned.length > 25) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "categories: 25 entries at most",
        });
    }
    const seen = new Set();
    const out = [];
    for (const entry of cleaned) {
        const key = entry.toLowerCase();
        if (seen.has(key))
            continue;
        seen.add(key);
        out.push(entry);
    }
    return out.length > 0 ? out : null;
}
function validateRssConfig(raw) {
    var _a;
    const feeds = Array.isArray(raw === null || raw === void 0 ? void 0 : raw.feeds) ? raw.feeds : [];
    if (feeds.length > constants_1.RSS_MAX_FEEDS) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `feeds: ${constants_1.RSS_MAX_FEEDS} at most — each one is a separate request inside a single sync run`,
        });
    }
    const out = [];
    const seen = new Set();
    for (const entry of feeds) {
        const rawUrl = typeof entry === "string" ? entry : entry === null || entry === void 0 ? void 0 : entry.url;
        const trimmed = String(rawUrl !== null && rawUrl !== void 0 ? rawUrl : "").trim();
        if (!trimmed)
            continue;
        const url = (0, coerce_1.safeHttpUrl)(trimmed);
        if (!url) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `feeds: "${trimmed.slice(0, 120)}" is not a valid http or https URL`,
            });
        }
        if (seen.has(url))
            continue;
        seen.add(url);
        const category = typeof entry === "string"
            ? undefined
            : String((_a = entry === null || entry === void 0 ? void 0 : entry.category) !== null && _a !== void 0 ? _a : "").trim().slice(0, 64) || undefined;
        out.push(category ? { url, category } : { url });
    }
    return { feeds: out };
}
function validateCryptopanicConfig(raw) {
    var _a, _b;
    const out = {};
    const filter = String((_a = raw === null || raw === void 0 ? void 0 : raw.filter) !== null && _a !== void 0 ? _a : "").trim();
    if (filter) {
        if (!constants_1.CRYPTOPANIC_FILTERS.includes(filter)) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `filter: must be one of ${constants_1.CRYPTOPANIC_FILTERS.join(", ")}`,
            });
        }
        out.filter = filter;
    }
    const kind = String((_b = raw === null || raw === void 0 ? void 0 : raw.kind) !== null && _b !== void 0 ? _b : "").trim();
    if (kind) {
        if (kind !== "news" && kind !== "media") {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "kind: must be news or media",
            });
        }
        out.kind = kind;
    }
    return out;
}
function validateNewsProviderConfig(name, raw) {
    if (raw === null || raw === undefined)
        return null;
    if (typeof raw !== "object" || Array.isArray(raw)) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "config must be an object",
        });
    }
    let value;
    switch (name) {
        case "rss":
            value = validateRssConfig(raw);
            break;
        case "cryptopanic":
            value = validateCryptopanicConfig(raw);
            break;
        default:
            value = {};
    }
    return Object.keys(value).length > 0 ? value : null;
}
function validateBoundedInt(raw, field, min, max) {
    const value = Number(raw);
    if (!Number.isFinite(value) || !Number.isInteger(value)) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `${field} must be a whole number`,
        });
    }
    if (value < min || value > max) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `${field} must be between ${min} and ${max}`,
        });
    }
    return value;
}
function readProviderConfig(raw) {
    if (raw === null || raw === undefined || raw === "")
        return null;
    if (typeof raw === "string") {
        try {
            const parsed = JSON.parse(raw);
            return parsed && typeof parsed === "object" && !Array.isArray(parsed)
                ? parsed
                : null;
        }
        catch (_a) {
            return null;
        }
    }
    return typeof raw === "object" && !Array.isArray(raw)
        ? raw
        : null;
}
function validateProviderApiKey(raw) {
    if (raw === undefined)
        return undefined;
    if (raw === null || raw === "")
        return null;
    const value = String(raw).trim();
    if (!value)
        return null;
    if (value.length > 500) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "apiKey must be 500 characters or fewer",
        });
    }
    if (/^["']|["']$/.test(value)) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "apiKey contains quotes. Paste the raw value — the quotes in a .env line are syntax, not part of the credential.",
        });
    }
    if (/\s/.test(value)) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "apiKey contains whitespace. Check for a stray line break or a copied prefix such as 'Apikey '.",
        });
    }
    return value;
}
