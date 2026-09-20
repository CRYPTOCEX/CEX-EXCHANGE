"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CTA_PERMITTED_STOREFRONTS = exports.STOREFRONT_HEADER = void 0;
exports.resolveStorefront = resolveStorefront;
exports.mayShowPurchaseCta = mayShowPurchaseCta;
exports.assertPurchaseAllowedOnNativeApp = assertPurchaseAllowedOnNativeApp;
const error_1 = require("@b/utils/error");
const session_1 = require("@b/utils/session");
exports.STOREFRONT_HEADER = "storefront";
exports.CTA_PERMITTED_STOREFRONTS = new Set(["US"]);
function headerValue(headers) {
    const v = headers === null || headers === void 0 ? void 0 : headers[exports.STOREFRONT_HEADER];
    if (typeof v === "string")
        return v;
    if (Array.isArray(v) && typeof v[0] === "string")
        return v[0];
    return "";
}
function resolveStorefront(req) {
    const raw = headerValue(req === null || req === void 0 ? void 0 : req.headers).trim().toUpperCase();
    return /^[A-Z]{2}$/.test(raw) ? raw : null;
}
function mayShowPurchaseCta(req) {
    if (!(0, session_1.isNativeAppRequest)(req))
        return true;
    const storefront = resolveStorefront(req);
    return storefront !== null && exports.CTA_PERMITTED_STOREFRONTS.has(storefront);
}
function assertPurchaseAllowedOnNativeApp(req, what) {
    if (mayShowPurchaseCta(req))
        return;
    throw (0, error_1.createError)({
        statusCode: 403,
        message: `You can browse and view items in the app, but cannot ${what} here.`,
    });
}
