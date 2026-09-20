"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateGeoSettingsBody = validateGeoSettingsBody;
exports.projectGeoPolicy = projectGeoPolicy;
const address_parser_1 = require("@b/handler/utils/address-parser");
const cache_1 = require("@b/utils/cache");
const error_1 = require("@b/utils/error");
const geo_1 = require("@b/utils/geo");
const BOOLEAN_KEYS = [
    geo_1.GEO_SETTING_KEYS.enabled,
    geo_1.GEO_SETTING_KEYS.allowAccountExit,
    geo_1.GEO_SETTING_KEYS.blockUnknownCountry,
    geo_1.GEO_SETTING_KEYS.failOpen,
    geo_1.GEO_SETTING_KEYS.adminBypass,
    geo_1.GEO_SETTING_KEYS.trustCdnHeaders,
    geo_1.GEO_SETTING_KEYS.trustKycCountry,
    geo_1.GEO_SETTING_KEYS.trustProfileCountry,
    geo_1.GEO_SETTING_KEYS.blockAnonymizedIps,
];
const ENUM_KEYS = {
    [geo_1.GEO_SETTING_KEYS.mode]: ["BLOCKLIST", "ALLOWLIST"],
    [geo_1.GEO_SETTING_KEYS.lookupProvider]: ["NONE", "IP_API", "IPINFO", "IPAPI_CO"],
    [geo_1.GEO_SETTING_KEYS.logMode]: ["NONE", "BLOCKED", "ALL"],
};
const NUMBER_KEYS = {
    [geo_1.GEO_SETTING_KEYS.lookupCacheTtl]: { min: 300, max: 2592000 },
    [geo_1.GEO_SETTING_KEYS.logRetentionDays]: { min: 0, max: 3650 },
    [geo_1.GEO_SETTING_KEYS.logDedupeSeconds]: { min: 0, max: 86400 },
};
const TEXT_KEYS = {
    [geo_1.GEO_SETTING_KEYS.lookupApiKey]: 255,
    [geo_1.GEO_SETTING_KEYS.noticeTitle]: 200,
    [geo_1.GEO_SETTING_KEYS.noticeMessage]: 2000,
    [geo_1.GEO_SETTING_KEYS.contactEmail]: 255,
};
const IP_LIST_KEYS = [
    geo_1.GEO_SETTING_KEYS.ipAllowlist,
    geo_1.GEO_SETTING_KEYS.ipBlocklist,
];
function toBooleanString(value) {
    if (typeof value === "boolean")
        return value ? "true" : "false";
    const s = String(value !== null && value !== void 0 ? value : "").trim().toLowerCase();
    if (["true", "1", "yes", "on"].includes(s))
        return "true";
    if (["false", "0", "no", "off", ""].includes(s))
        return "false";
    throw (0, error_1.createError)({
        statusCode: 400,
        message: `Expected a true/false value, received "${value}"`,
    });
}
function validateGeoSettingsBody(body) {
    if (!body || typeof body !== "object" || Array.isArray(body)) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Request body must be an object of policy key/value pairs",
        });
    }
    const source = body;
    const force = source.force === true || source.force === "true";
    const updates = {};
    for (const [key, rawValue] of Object.entries(source)) {
        if (key === "force")
            continue;
        if (BOOLEAN_KEYS.includes(key)) {
            updates[key] = toBooleanString(rawValue);
            continue;
        }
        if (ENUM_KEYS[key]) {
            const value = String(rawValue !== null && rawValue !== void 0 ? rawValue : "").trim().toUpperCase();
            if (!ENUM_KEYS[key].includes(value)) {
                throw (0, error_1.createError)({
                    statusCode: 400,
                    message: `"${key}" must be one of ${ENUM_KEYS[key].join(", ")}`,
                });
            }
            updates[key] = value;
            continue;
        }
        if (NUMBER_KEYS[key]) {
            const { min, max } = NUMBER_KEYS[key];
            const value = Number(rawValue);
            if (!Number.isFinite(value) || value < min || value > max) {
                throw (0, error_1.createError)({
                    statusCode: 400,
                    message: `"${key}" must be a number between ${min} and ${max}`,
                });
            }
            updates[key] = String(Math.trunc(value));
            continue;
        }
        if (IP_LIST_KEYS.includes(key)) {
            const entries = (0, geo_1.parseIpList)(rawValue);
            for (const entry of entries) {
                const problem = (0, geo_1.validateIpEntry)(entry);
                if (problem) {
                    throw (0, error_1.createError)({ statusCode: 400, message: problem });
                }
            }
            updates[key] = entries.join(",");
            continue;
        }
        if (TEXT_KEYS[key] !== undefined) {
            const value = String(rawValue !== null && rawValue !== void 0 ? rawValue : "").trim();
            if (value.length > TEXT_KEYS[key]) {
                throw (0, error_1.createError)({
                    statusCode: 400,
                    message: `"${key}" must be ${TEXT_KEYS[key]} characters or fewer`,
                });
            }
            if (key === geo_1.GEO_SETTING_KEYS.lookupApiKey && value === "")
                continue;
            updates[key] = value;
            continue;
        }
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `"${key}" is not a geographic restriction policy setting`,
        });
    }
    return { updates, force };
}
async function projectGeoPolicy(before, updates, request) {
    const rawSettings = await cache_1.CacheManager.getInstance().getSettings();
    const projected = new Map(rawSettings);
    for (const [key, value] of Object.entries(updates))
        projected.set(key, value);
    const projectedPolicy = (0, geo_1.buildPolicy)(projected);
    let actor = null;
    try {
        const actorIp = (0, geo_1.resolveClientIp)((request === null || request === void 0 ? void 0 : request.remoteAddress) || "127.0.0.1", (request === null || request === void 0 ? void 0 : request.headers) || {});
        const location = await (0, geo_1.locationFromIp)(actorIp, projectedPolicy);
        actor = location
            ? { ip: actorIp, location, roleName: null }
            : { ip: actorIp, location: null, roleName: null };
    }
    catch (_a) {
    }
    const preflight = (0, geo_1.preflightPolicy)(before, projectedPolicy, {
        evidence: (0, geo_1.getDetectionHealth)().evidence,
        rules: (0, geo_1.getRules)(),
        actor,
        trustProxy: (0, address_parser_1.describeProxyTrust)().mode !== "none",
    });
    return { projectedPolicy, preflight };
}
