"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isHbBotApiPath = void 0;
exports.isPrivateFilePath = isPrivateFilePath;
exports.handlePreflightRequest = handlePreflightRequest;
exports.applyCorsHeaders = applyCorsHeaders;
const utils_1 = require("../../utils");
const isDev = process.env.NODE_ENV === "development";
function isProviderWebhookPath(path) {
    return /^\/api\/finance\/(deposit|withdraw)\/fiat\/[^/]+\/webhook$/.test(path);
}
function isPrivateFilePath(path) {
    return (/^\/api\/p2p\/trade\/[^/]+\/message\/attachment\/[^/]+$/.test(path) ||
        /^\/api\/user\/kyc\/document\/[^/]+\/[^/]+$/.test(path));
}
const hb_paths_1 = require("./hb-paths");
Object.defineProperty(exports, "isHbBotApiPath", { enumerable: true, get: function () { return hb_paths_1.isHbBotApiPath; } });
function getPathFromRequest(req) {
    const raw = typeof req.url === "string" ? req.url : req.getUrl ? req.getUrl() : "";
    return (raw || "").split("?")[0];
}
function handlePreflightRequest(res, req) {
    const origin = getOriginFromRequest(req);
    if (isDev) {
        (0, utils_1.setCORSHeaders)(res, origin || "http://localhost:3000");
    }
    else {
        const isAllowed = origin && utils_1.allowedOrigins.includes(origin);
        if (isAllowed) {
            (0, utils_1.setCORSHeaders)(res, origin);
        }
    }
    res.end();
}
function applyCorsHeaders(res, req) {
    const path = getPathFromRequest(req);
    if ((0, hb_paths_1.isHbBotApiPath)(path)) {
        return;
    }
    if (isProviderWebhookPath(path)) {
        return;
    }
    if (isPrivateFilePath(path)) {
        return;
    }
    const origin = getOriginFromRequest(req);
    if (isDev) {
        setCORSHeadersCompat(res, origin || "http://localhost:3000");
    }
    else {
        const isAllowed = origin && utils_1.allowedOrigins.includes(origin);
        if (isAllowed) {
            setCORSHeadersCompat(res, origin);
        }
    }
}
function setCORSHeadersCompat(res, origin) {
    if (res.writeHeader) {
        res.writeHeader("Access-Control-Allow-Origin", origin);
        res.writeHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
        res.writeHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, Accept, Accept-Language, Accept-Encoding, Origin, Cache-Control, Pragma, accessToken, refreshToken, sessionId, csrfToken, x-api-key, idempotency-key, platform, client-platform, app-version, client-device-id");
        res.writeHeader("Access-Control-Allow-Credentials", "true");
        res.writeHeader("Access-Control-Max-Age", "86400");
    }
}
function getOriginFromRequest(req) {
    var _a, _b, _c, _d;
    return ((_a = req.getHeader) === null || _a === void 0 ? void 0 : _a.call(req, "origin")) || ((_b = req.getHeader) === null || _b === void 0 ? void 0 : _b.call(req, "Origin")) ||
        ((_c = req.headers) === null || _c === void 0 ? void 0 : _c["origin"]) || ((_d = req.headers) === null || _d === void 0 ? void 0 : _d["Origin"]);
}
