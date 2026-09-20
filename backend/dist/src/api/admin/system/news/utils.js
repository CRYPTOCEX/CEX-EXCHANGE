"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.marketNewsBodySchema = void 0;
exports.validateMarketNewsBody = validateMarketNewsBody;
const error_1 = require("@b/utils/error");
const html_to_text_1 = require("@b/utils/news/html-to-text");
exports.marketNewsBodySchema = {
    headline: { type: "string", description: "Story headline" },
    publishedAt: {
        type: "string",
        description: "Publication instant (ISO 8601, UTC). Defaults to now on create",
    },
    summary: { type: "string", description: "Story body / desk commentary" },
    url: { type: "string", description: "Source link (http/https only)" },
    imageUrl: { type: "string", description: "Thumbnail URL (http/https only)" },
    category: { type: "string", description: "crypto, general, ..." },
    relatedSymbols: {
        type: "array",
        items: { type: "string" },
        description: 'Assets this story is tagged with, e.g. ["BTC","USDT"]',
    },
    status: { type: "boolean", description: "Visible to clients" },
};
function validateUrl(value, field, maxLen) {
    if (value === undefined)
        return undefined;
    if (value === null || value === "")
        return null;
    const s = String(value).trim();
    if (!s)
        return null;
    if (s.length > maxLen) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `${field} must be ${maxLen} characters or fewer`,
        });
    }
    let parsed;
    try {
        parsed = new URL(s);
    }
    catch (_a) {
        throw (0, error_1.createError)({ statusCode: 400, message: `${field} must be a valid URL` });
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `${field} must use http or https`,
        });
    }
    return s;
}
function validateMarketNewsBody(body, isCreate) {
    var _a, _b;
    const values = {};
    if (isCreate || body.headline !== undefined) {
        const headline = (0, html_to_text_1.htmlToPlainText)(String((_a = body.headline) !== null && _a !== void 0 ? _a : ""));
        if (!headline) {
            throw (0, error_1.createError)({ statusCode: 400, message: "headline is required" });
        }
        if (headline.length > 500) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "headline must be 500 characters or fewer",
            });
        }
        values.headline = headline;
    }
    if (body.publishedAt !== undefined) {
        const parsed = new Date(body.publishedAt);
        if (isNaN(parsed.getTime())) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "publishedAt must be a valid ISO 8601 date-time",
            });
        }
        values.publishedAt = parsed;
    }
    else if (isCreate) {
        values.publishedAt = new Date();
    }
    if (body.summary !== undefined) {
        values.summary =
            body.summary === null || body.summary === ""
                ? null
                : (0, html_to_text_1.htmlToPlainText)(String(body.summary), 5000) || null;
    }
    const url = validateUrl(body.url, "url", 1000);
    if (url !== undefined)
        values.url = url;
    const imageUrl = validateUrl(body.imageUrl, "imageUrl", 1000);
    if (imageUrl !== undefined)
        values.imageUrl = imageUrl;
    if (body.category !== undefined) {
        const category = String((_b = body.category) !== null && _b !== void 0 ? _b : "").trim();
        if (category.length > 64) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "category must be 64 characters or fewer",
            });
        }
        values.category = category || null;
    }
    if (body.relatedSymbols !== undefined) {
        if (body.relatedSymbols === null || body.relatedSymbols === "") {
            values.relatedSymbols = null;
        }
        else {
            const raw = Array.isArray(body.relatedSymbols)
                ? body.relatedSymbols
                : String(body.relatedSymbols).split(",");
            const list = raw
                .map((s) => String(s).trim().toUpperCase())
                .filter(Boolean)
                .slice(0, 25);
            values.relatedSymbols = list.length > 0 ? list : null;
        }
    }
    if (body.status !== undefined)
        values.status = !!body.status;
    return values;
}
