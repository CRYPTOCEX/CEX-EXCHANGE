"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isNativeAppRequest = isNativeAppRequest;
exports.parseUserAgent = parseUserAgent;
exports.extractRequestIp = extractRequestIp;
exports.deviceFingerprint = deviceFingerprint;
exports.buildSessionDeviceMeta = buildSessionDeviceMeta;
const address_parser_1 = require("@b/handler/utils/address-parser");
const crypto_1 = __importDefault(require("crypto"));
const header_parser_1 = require("@b/handler/utils/header-parser");
function platformHeaderIsNative(headers) {
    return (0, header_parser_1.isAppPlatform)(headers);
}
const NATIVE_PLATFORMS = {
    ios: { os: "iOS", client: "iOS app", tablet: false },
    ipados: { os: "iPadOS", client: "iPadOS app", tablet: true },
    android: { os: "Android", client: "Android app", tablet: false },
};
function isNativeAppRequest(req) {
    return platformHeaderIsNative(req === null || req === void 0 ? void 0 : req.headers);
}
function headerValue(headers, key) {
    const v = headers === null || headers === void 0 ? void 0 : headers[key];
    if (typeof v === "string")
        return v;
    if (Array.isArray(v) && typeof v[0] === "string")
        return v[0];
    return "";
}
function parseUserAgent(ua) {
    const s = ua || "";
    let os = "Unknown OS";
    if (/Windows NT 10/.test(s))
        os = "Windows 10/11";
    else if (/Windows NT/.test(s))
        os = "Windows";
    else if (/iPad/.test(s))
        os = "iPadOS";
    else if (/iPhone|iPod/.test(s))
        os = "iOS";
    else if (/Android/.test(s))
        os = "Android";
    else if (/Mac OS X|Macintosh/.test(s))
        os = "macOS";
    else if (/CrOS/.test(s))
        os = "ChromeOS";
    else if (/Linux/.test(s))
        os = "Linux";
    let browser = "Unknown Browser";
    if (/Flutter|Dart\//i.test(s))
        browser = "Mobile App";
    else if (/Edg\//.test(s))
        browser = "Edge";
    else if (/OPR\/|Opera/.test(s))
        browser = "Opera";
    else if (/Brave\//.test(s))
        browser = "Brave";
    else if (/Chrome\//.test(s) && !/Chromium/.test(s))
        browser = "Chrome";
    else if (/Chromium/.test(s))
        browser = "Chromium";
    else if (/Firefox\//.test(s))
        browser = "Firefox";
    else if (/Safari/.test(s))
        browser = "Safari";
    else if (/MSIE|Trident/.test(s))
        browser = "Internet Explorer";
    let deviceType = "desktop";
    if (/iPad|Tablet|PlayBook|Silk/.test(s) || (/Android/.test(s) && !/Mobile/.test(s))) {
        deviceType = "tablet";
    }
    else if (/Mobi|iPhone|iPod|Android.*Mobile|Windows Phone/.test(s)) {
        deviceType = "mobile";
    }
    return { browser, os, deviceType };
}
function extractRequestIp(req) {
    if (!req)
        return null;
    const resolved = (0, address_parser_1.requestClientIp)(req);
    return resolved && resolved !== "unknown" ? resolved : null;
}
function deviceFingerprint(ua, acceptLanguage) {
    return crypto_1.default
        .createHash("sha256")
        .update(`${ua || ""}|${acceptLanguage || ""}`)
        .digest("hex")
        .slice(0, 16);
}
function buildSessionDeviceMeta(req) {
    const headers = (req === null || req === void 0 ? void 0 : req.headers) || {};
    const ua = headerValue(headers, "user-agent");
    const acceptLanguage = headerValue(headers, "accept-language");
    let { browser, os, deviceType } = parseUserAgent(ua);
    const native = NATIVE_PLATFORMS[headerValue(headers, "client-platform").toLowerCase()];
    const isNative = platformHeaderIsNative(headers);
    let client;
    let appVersion;
    if (isNative) {
        client = native ? native.client : "Mobile app";
        browser = client;
        if (native) {
            os = native.os;
            deviceType = native.tablet ? "tablet" : "mobile";
        }
        else if (deviceType === "desktop") {
            deviceType = "mobile";
        }
        appVersion = headerValue(headers, "app-version").slice(0, 32) || undefined;
    }
    const country = headerValue(headers, "cf-ipcountry");
    const location = country && country !== "XX" && country !== "T1" ? country : null;
    const now = new Date().toISOString();
    return {
        ip: extractRequestIp(req),
        userAgent: ua ? ua.slice(0, 512) : null,
        browser,
        os,
        deviceType,
        location,
        fingerprint: deviceFingerprint(`${ua}|${client || ""}`, acceptLanguage),
        createdAt: now,
        lastActive: now,
        ...(client ? { client } : {}),
        ...(appVersion ? { appVersion } : {}),
    };
}
