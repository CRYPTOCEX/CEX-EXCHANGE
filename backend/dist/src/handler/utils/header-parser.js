"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SECURITY_HEADERS = void 0;
exports.parseRequestHeaders = parseRequestHeaders;
exports.isAppPlatform = isAppPlatform;
exports.getContentType = getContentType;
exports.getAcceptEncoding = getAcceptEncoding;
const JOINABLE_HEADERS = new Set([
    "x-forwarded-for",
    "x-forwarded-host",
    "x-forwarded-proto",
    "forwarded",
    "via",
]);
function parseRequestHeaders(req) {
    const headers = {};
    req.forEach((key, value) => {
        const name = key.toLowerCase();
        const seen = headers[name];
        if (seen !== undefined && JOINABLE_HEADERS.has(name)) {
            headers[name] = `${seen}, ${value}`;
            return;
        }
        headers[name] = value;
    });
    return headers;
}
function isAppPlatform(headers) {
    const value = headers === null || headers === void 0 ? void 0 : headers.platform;
    if (!value)
        return false;
    return ["app", "ios", "ipados", "android", "mobile", "native"].includes(String(value).trim().toLowerCase());
}
exports.SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
};
function getContentType(headers) {
    return headers["content-type"] || "";
}
function getAcceptEncoding(headers) {
    return headers["accept-encoding"] || "";
}
