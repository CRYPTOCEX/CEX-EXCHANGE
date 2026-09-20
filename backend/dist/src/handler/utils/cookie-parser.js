"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseCookieHeader = parseCookieHeader;
exports.buildCookieHeader = buildCookieHeader;
function parseCookieHeader(cookieHeader) {
    const cookies = {};
    if (!cookieHeader) {
        return cookies;
    }
    cookieHeader
        .split(";")
        .map((c) => c.trim())
        .forEach((cookie) => {
        const eqIndex = cookie.indexOf("=");
        if (eqIndex > -1) {
            const name = cookie.substring(0, eqIndex).trim();
            const val = cookie.substring(eqIndex + 1).trim();
            cookies[name] = val;
        }
    });
    return cookies;
}
function buildCookieHeader(name, value, options) {
    var _a;
    let cookie = `${name}=${value};`;
    cookie += ` Path=${(_a = options === null || options === void 0 ? void 0 : options.path) !== null && _a !== void 0 ? _a : "/"};`;
    if (options === null || options === void 0 ? void 0 : options.httpOnly) {
        cookie += " HttpOnly;";
    }
    if (options === null || options === void 0 ? void 0 : options.secure) {
        cookie += " Secure;";
    }
    if (options === null || options === void 0 ? void 0 : options.sameSite) {
        cookie += ` SameSite=${options.sameSite};`;
    }
    if (options === null || options === void 0 ? void 0 : options.expires) {
        cookie += ` Expires=${options.expires};`;
    }
    if ((options === null || options === void 0 ? void 0 : options.maxAge) !== undefined) {
        cookie += ` Max-Age=${options.maxAge};`;
    }
    return cookie;
}
