"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HTML_CONTENT_FIELDS = void 0;
exports.stripUnsafeHtmlForApp = stripUnsafeHtmlForApp;
exports.stripHtmlFields = stripHtmlFields;
exports.shapeHtmlForClient = shapeHtmlForClient;
const session_1 = require("@b/utils/session");
const IFRAME_RE = /<iframe\b[^>]*>[\s\S]*?<\/iframe>|<iframe\b[^>]*\/?>/gi;
const SCRIPT_RE = /<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi;
const EMBED_RE = /<object\b[^>]*>[\s\S]*?<\/object>|<embed\b[^>]*\/?>|<applet\b[^>]*>[\s\S]*?<\/applet>/gi;
const ANCHOR_TAG_RE = /<\/?a\b[^>]*>/gi;
const EVENT_ATTR_RE = /\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi;
function stripUnsafeHtmlForApp(html) {
    if (typeof html !== "string" || html.length === 0)
        return "";
    return html
        .replace(SCRIPT_RE, "")
        .replace(IFRAME_RE, "")
        .replace(EMBED_RE, "")
        .replace(ANCHOR_TAG_RE, "")
        .replace(EVENT_ATTR_RE, "");
}
function stripHtmlFields(payload, fields, depth = 0) {
    if (depth > 12 || payload === null || payload === undefined)
        return payload;
    const named = new Set(fields.map((f) => f.toLowerCase()));
    if (Array.isArray(payload)) {
        return payload.map((item) => stripHtmlFields(item, fields, depth + 1));
    }
    if (typeof payload !== "object" || payload instanceof Date)
        return payload;
    const out = {};
    for (const [key, value] of Object.entries(payload)) {
        if (named.has(key.toLowerCase()) && typeof value === "string") {
            out[key] = stripUnsafeHtmlForApp(value);
            continue;
        }
        out[key] = stripHtmlFields(value, fields, depth + 1);
    }
    return out;
}
function shapeHtmlForClient(payload, req) {
    if (!(0, session_1.isNativeAppRequest)(req))
        return payload;
    return stripHtmlFields(payload, exports.HTML_CONTENT_FIELDS);
}
exports.HTML_CONTENT_FIELDS = [
    "answer",
    "content",
    "body",
    "description",
];
