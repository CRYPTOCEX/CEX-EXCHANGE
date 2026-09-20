"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeCountry = exports.GEO_POLICY_DEFAULTS = exports.GEO_SETTING_KEY_LIST = exports.GEO_SETTING_KEYS = exports.GEO_SETTING_PREFIX = void 0;
exports.isGeoSettingKey = isGeoSettingKey;
exports.parseIpList = parseIpList;
exports.buildPolicy = buildPolicy;
exports.setEmergencyOverride = setEmergencyOverride;
exports.clearEmergencyOverrides = clearEmergencyOverrides;
exports.getEmergencyOverrides = getEmergencyOverrides;
exports.getPolicy = getPolicy;
exports.refreshPolicy = refreshPolicy;
exports.loadPolicy = loadPolicy;
exports.invalidatePolicy = invalidatePolicy;
const cache_1 = require("@b/utils/cache");
const console_1 = require("@b/utils/console");
const countries_1 = require("./countries");
exports.GEO_SETTING_PREFIX = "geoRestriction";
exports.GEO_SETTING_KEYS = {
    enabled: "geoRestrictionEnabled",
    mode: "geoRestrictionMode",
    allowAccountExit: "geoRestrictionAllowAccountExit",
    blockUnknownCountry: "geoRestrictionBlockUnknownCountry",
    failOpen: "geoRestrictionFailOpen",
    adminBypass: "geoRestrictionAdminBypass",
    ipAllowlist: "geoRestrictionIpAllowlist",
    ipBlocklist: "geoRestrictionIpBlocklist",
    lookupProvider: "geoRestrictionLookupProvider",
    lookupApiKey: "geoRestrictionLookupApiKey",
    lookupCacheTtl: "geoRestrictionLookupCacheTtl",
    trustCdnHeaders: "geoRestrictionTrustCdnHeaders",
    trustKycCountry: "geoRestrictionTrustKycCountry",
    trustProfileCountry: "geoRestrictionTrustProfileCountry",
    blockAnonymizedIps: "geoRestrictionBlockAnonymizedIps",
    logMode: "geoRestrictionLogMode",
    logRetentionDays: "geoRestrictionLogRetentionDays",
    logDedupeSeconds: "geoRestrictionLogDedupeSeconds",
    noticeTitle: "geoRestrictionNoticeTitle",
    noticeMessage: "geoRestrictionNoticeMessage",
    contactEmail: "geoRestrictionContactEmail",
};
exports.GEO_SETTING_KEY_LIST = Object.values(exports.GEO_SETTING_KEYS);
const GEO_SETTING_KEY_SET = new Set(exports.GEO_SETTING_KEY_LIST.map((k) => k.toLowerCase()));
function isGeoSettingKey(key) {
    return GEO_SETTING_KEY_SET.has(String(key).toLowerCase());
}
exports.GEO_POLICY_DEFAULTS = {
    enabled: false,
    mode: "BLOCKLIST",
    allowAccountExit: true,
    blockUnknownCountry: false,
    failOpen: true,
    adminBypass: true,
    ipAllowlist: [],
    ipBlocklist: [],
    lookupProvider: "NONE",
    lookupApiKey: "",
    lookupCacheTtl: 86400,
    trustCdnHeaders: true,
    trustKycCountry: true,
    trustProfileCountry: false,
    blockAnonymizedIps: false,
    logMode: "BLOCKED",
    logRetentionDays: 365,
    logDedupeSeconds: 300,
    noticeTitle: "",
    noticeMessage: "",
    contactEmail: "",
};
const VALID_MODES = ["BLOCKLIST", "ALLOWLIST"];
const VALID_PROVIDERS = [
    "NONE",
    "IP_API",
    "IPINFO",
    "IPAPI_CO",
];
const VALID_LOG_MODES = ["NONE", "BLOCKED", "ALL"];
function toBool(value, fallback) {
    if (typeof value === "boolean")
        return value;
    if (value === undefined || value === null || value === "")
        return fallback;
    const s = String(value).trim().toLowerCase();
    if (s === "true" || s === "1" || s === "yes" || s === "on")
        return true;
    if (s === "false" || s === "0" || s === "no" || s === "off")
        return false;
    return fallback;
}
function toInt(value, fallback, min, max) {
    const n = Number(value);
    if (!Number.isFinite(n))
        return fallback;
    return Math.min(max, Math.max(min, Math.trunc(n)));
}
function toEnum(value, allowed, fallback) {
    const s = String(value !== null && value !== void 0 ? value : "")
        .trim()
        .toUpperCase();
    return allowed.includes(s) ? s : fallback;
}
function toStr(value, fallback, maxLength = 2000) {
    if (value === undefined || value === null)
        return fallback;
    const s = String(value).trim();
    return s.length > maxLength ? s.slice(0, maxLength) : s;
}
function parseIpList(value) {
    if (Array.isArray(value)) {
        return value.map((v) => String(v).trim()).filter(Boolean);
    }
    if (typeof value !== "string" || !value.trim())
        return [];
    return value
        .split(/[\s,;]+/)
        .map((v) => v.trim())
        .filter(Boolean);
}
function buildPolicy(raw) {
    const get = (key) => raw instanceof Map ? raw.get(key) : raw[key];
    const d = exports.GEO_POLICY_DEFAULTS;
    const K = exports.GEO_SETTING_KEYS;
    return {
        enabled: toBool(get(K.enabled), d.enabled),
        mode: toEnum(get(K.mode), VALID_MODES, d.mode),
        allowAccountExit: toBool(get(K.allowAccountExit), d.allowAccountExit),
        blockUnknownCountry: toBool(get(K.blockUnknownCountry), d.blockUnknownCountry),
        failOpen: toBool(get(K.failOpen), d.failOpen),
        adminBypass: toBool(get(K.adminBypass), d.adminBypass),
        ipAllowlist: parseIpList(get(K.ipAllowlist)),
        ipBlocklist: parseIpList(get(K.ipBlocklist)),
        lookupProvider: toEnum(get(K.lookupProvider), VALID_PROVIDERS, d.lookupProvider),
        lookupApiKey: toStr(get(K.lookupApiKey), d.lookupApiKey, 255),
        lookupCacheTtl: toInt(get(K.lookupCacheTtl), d.lookupCacheTtl, 300, 2592000),
        trustCdnHeaders: toBool(get(K.trustCdnHeaders), d.trustCdnHeaders),
        trustKycCountry: toBool(get(K.trustKycCountry), d.trustKycCountry),
        trustProfileCountry: toBool(get(K.trustProfileCountry), d.trustProfileCountry),
        blockAnonymizedIps: toBool(get(K.blockAnonymizedIps), d.blockAnonymizedIps),
        logMode: toEnum(get(K.logMode), VALID_LOG_MODES, d.logMode),
        logRetentionDays: toInt(get(K.logRetentionDays), d.logRetentionDays, 0, 3650),
        logDedupeSeconds: toInt(get(K.logDedupeSeconds), d.logDedupeSeconds, 0, 86400),
        noticeTitle: toStr(get(K.noticeTitle), d.noticeTitle, 200),
        noticeMessage: toStr(get(K.noticeMessage), d.noticeMessage, 2000),
        contactEmail: toStr(get(K.contactEmail), d.contactEmail, 255),
    };
}
const REFRESH_INTERVAL_MS = 30000;
let snapshot = { ...exports.GEO_POLICY_DEFAULTS };
let lastLoaded = 0;
let refreshing = null;
let emergencyOverrides = {};
let emergencyReason = null;
function setEmergencyOverride(patch, reason) {
    emergencyOverrides = { ...emergencyOverrides, ...patch };
    emergencyReason = reason;
    snapshot = { ...snapshot, ...emergencyOverrides };
}
function clearEmergencyOverrides() {
    emergencyOverrides = {};
    emergencyReason = null;
}
function getEmergencyOverrides() {
    return {
        active: Object.keys(emergencyOverrides).length > 0,
        patch: { ...emergencyOverrides },
        reason: emergencyReason,
    };
}
function getPolicy() {
    if (Date.now() - lastLoaded > REFRESH_INTERVAL_MS) {
        void refreshPolicy();
    }
    return snapshot;
}
function refreshPolicy() {
    if (refreshing)
        return refreshing;
    refreshing = (async () => {
        try {
            const settings = await cache_1.CacheManager.getInstance().getSettings();
            snapshot = { ...buildPolicy(settings), ...emergencyOverrides };
            lastLoaded = Date.now();
        }
        catch (error) {
            console_1.logger.warn("GEO", `Failed to refresh geo policy, keeping previous snapshot: ${error === null || error === void 0 ? void 0 : error.message}`);
        }
        finally {
            refreshing = null;
        }
        return snapshot;
    })();
    return refreshing;
}
async function loadPolicy() {
    await refreshPolicy();
    return snapshot;
}
function invalidatePolicy() {
    lastLoaded = 0;
}
exports.normalizeCountry = countries_1.toAlpha2;
