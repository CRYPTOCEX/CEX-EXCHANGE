"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeHTML = sanitizeHTML;
function sanitizeHTML(html) {
    if (!html || typeof html !== "string")
        return "";
    let sanitized = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
    sanitized = sanitized.replace(/\s*on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi, "");
    sanitized = sanitized.replace(/(href|src)\s*=\s*(?:"javascript:[^"]*"|'javascript:[^']*')/gi, '$1=""');
    sanitized = sanitized.replace(/(href|src)\s*=\s*(?:"data:[^"]*"|'data:[^']*')/gi, '$1=""');
    sanitized = sanitized.replace(/<\/?(?:iframe|embed|object|form|input|button)\b[^>]*>/gi, "");
    return sanitized;
}
