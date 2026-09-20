"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.URL_MAX = exports.SUMMARY_MAX = exports.HEADLINE_MAX = void 0;
exports.normaliseSymbolTag = normaliseSymbolTag;
exports.normaliseSymbolTags = normaliseSymbolTags;
exports.safeHttpUrl = safeHttpUrl;
exports.toEpochMs = toEpochMs;
exports.readFeeds = readFeeds;
const symbol_match_1 = require("../symbol-match");
const constants_1 = require("./constants");
exports.HEADLINE_MAX = 500;
exports.SUMMARY_MAX = 4000;
exports.URL_MAX = 1000;
function normaliseSymbolTag(raw) {
    const tag = String(raw).trim().toUpperCase();
    if (!tag)
        return [];
    const bare = tag.includes(":") ? tag.slice(tag.indexOf(":") + 1) : tag;
    if (/[/\-_]/.test(bare)) {
        return bare.split(/[/\-_]/).filter(Boolean);
    }
    const split = (0, symbol_match_1.splitConcatenatedPair)(bare);
    return split ? [split[0], split[1]] : [bare];
}
function normaliseSymbolTags(raw) {
    const list = Array.isArray(raw) ? raw : String(raw !== null && raw !== void 0 ? raw : "").split(",");
    const out = list
        .flatMap((tag) => normaliseSymbolTag(String(tag)))
        .filter(Boolean);
    return out.length > 0 ? Array.from(new Set(out)).slice(0, 25) : undefined;
}
function safeHttpUrl(raw) {
    const value = String(raw !== null && raw !== void 0 ? raw : "").trim();
    if (!value || value.length > exports.URL_MAX)
        return undefined;
    try {
        const parsed = new URL(value);
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:")
            return undefined;
    }
    catch (_a) {
        return undefined;
    }
    return value;
}
function toEpochMs(raw) {
    if (raw === null || raw === undefined || raw === "")
        return null;
    let ms;
    if (typeof raw === "number" || /^\d+$/.test(String(raw).trim())) {
        const n = Number(raw);
        if (!Number.isFinite(n) || n <= 0)
            return null;
        ms = n < 1e11 ? n * 1000 : n;
    }
    else {
        ms = new Date(String(raw)).getTime();
    }
    if (!Number.isFinite(ms) || ms <= 0)
        return null;
    if (ms > Date.now() + 7 * 86400000)
        return null;
    return ms;
}
function readFeeds(config) {
    var _a;
    const raw = Array.isArray(config === null || config === void 0 ? void 0 : config.feeds) ? config.feeds : [];
    const out = [];
    for (const entry of raw) {
        const url = safeHttpUrl(typeof entry === "string" ? entry : entry === null || entry === void 0 ? void 0 : entry.url);
        if (!url)
            continue;
        const category = typeof entry === "string"
            ? undefined
            : String((_a = entry === null || entry === void 0 ? void 0 : entry.category) !== null && _a !== void 0 ? _a : "").trim().slice(0, 64) || undefined;
        out.push({ url, category });
        if (out.length >= constants_1.RSS_MAX_FEEDS)
            break;
    }
    return out;
}
