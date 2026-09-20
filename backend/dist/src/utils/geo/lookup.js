"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emptyLocation = emptyLocation;
exports.locationFromHeaders = locationFromHeaders;
exports.locationFromIpSync = locationFromIpSync;
exports.locationFromIp = locationFromIp;
exports.mergeLocation = mergeLocation;
exports.clearIpCache = clearIpCache;
const redis_1 = require("@b/utils/redis");
const console_1 = require("@b/utils/console");
const countries_1 = require("./countries");
const ip_1 = require("./ip");
const redis = redis_1.RedisSingleton.getInstance();
const CDN_COUNTRY_HEADERS = [
    "cf-ipcountry",
    "cloudfront-viewer-country",
    "x-vercel-ip-country",
    "fastly-geo-country",
    "x-appengine-country",
    "x-geo-country",
    "x-country-code",
];
const CDN_REGION_HEADERS = [
    "cf-region",
    "cloudfront-viewer-country-region-name",
    "x-vercel-ip-country-region",
    "x-geo-region",
];
const CDN_CITY_HEADERS = [
    "cf-ipcity",
    "cloudfront-viewer-city",
    "x-vercel-ip-city",
    "x-geo-city",
];
const TOR_SENTINEL = "T1";
function firstHeader(headers, names) {
    for (const name of names) {
        const raw = headers === null || headers === void 0 ? void 0 : headers[name];
        if (raw && String(raw).trim())
            return String(raw).trim();
    }
    return null;
}
function emptyLocation() {
    return {
        countryCode: null,
        countryName: null,
        region: null,
        city: null,
        source: "NONE",
        isProxy: null,
        isHosting: null,
        isTor: null,
        pending: false,
    };
}
function locationFromHeaders(headers) {
    const raw = firstHeader(headers, CDN_COUNTRY_HEADERS);
    if (!raw)
        return null;
    const upper = raw.toUpperCase();
    const code = (0, countries_1.toAlpha2)(raw);
    if (!code) {
        if (upper === TOR_SENTINEL) {
            return { ...emptyLocation(), source: "CDN_HEADER", isTor: true };
        }
        return null;
    }
    const region = firstHeader(headers, CDN_REGION_HEADERS);
    const city = firstHeader(headers, CDN_CITY_HEADERS);
    return {
        countryCode: code,
        countryName: (0, countries_1.getCountryName)(code),
        region: region ? region.slice(0, 128) : null,
        city: city ? city.slice(0, 128) : null,
        source: "CDN_HEADER",
        isProxy: null,
        isHosting: null,
        isTor: false,
        pending: false,
    };
}
const LOOKUP_TIMEOUT_MS = 4000;
async function fetchJson(url) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), LOOKUP_TIMEOUT_MS);
    try {
        const response = await fetch(url, {
            signal: controller.signal,
            headers: { accept: "application/json" },
        });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        return await response.json();
    }
    finally {
        clearTimeout(timer);
    }
}
async function lookupIpApi(address, apiKey) {
    var _a, _b, _c;
    const fields = "status,message,countryCode,country,regionName,city,proxy,hosting";
    const base = apiKey
        ? `https://pro.ip-api.com/json/${encodeURIComponent(address)}?key=${encodeURIComponent(apiKey)}`
        : `http://ip-api.com/json/${encodeURIComponent(address)}`;
    const url = `${base}${base.includes("?") ? "&" : "?"}fields=${fields}`;
    const data = await fetchJson(url);
    if ((data === null || data === void 0 ? void 0 : data.status) && data.status !== "success") {
        throw new Error(data.message || "ip-api lookup failed");
    }
    return {
        countryCode: (0, countries_1.toAlpha2)(data === null || data === void 0 ? void 0 : data.countryCode),
        countryName: (_a = data === null || data === void 0 ? void 0 : data.country) !== null && _a !== void 0 ? _a : null,
        region: (_b = data === null || data === void 0 ? void 0 : data.regionName) !== null && _b !== void 0 ? _b : null,
        city: (_c = data === null || data === void 0 ? void 0 : data.city) !== null && _c !== void 0 ? _c : null,
        isProxy: typeof (data === null || data === void 0 ? void 0 : data.proxy) === "boolean" ? data.proxy : null,
        isHosting: typeof (data === null || data === void 0 ? void 0 : data.hosting) === "boolean" ? data.hosting : null,
        isTor: null,
    };
}
async function lookupIpInfo(address, apiKey) {
    var _a, _b, _c;
    if (!apiKey)
        throw new Error("ipinfo.io requires an API token");
    const data = await fetchJson(`https://ipinfo.io/${encodeURIComponent(address)}/json?token=${encodeURIComponent(apiKey)}`);
    const privacy = (_a = data === null || data === void 0 ? void 0 : data.privacy) !== null && _a !== void 0 ? _a : {};
    return {
        countryCode: (0, countries_1.toAlpha2)(data === null || data === void 0 ? void 0 : data.country),
        countryName: (0, countries_1.getCountryName)(data === null || data === void 0 ? void 0 : data.country),
        region: (_b = data === null || data === void 0 ? void 0 : data.region) !== null && _b !== void 0 ? _b : null,
        city: (_c = data === null || data === void 0 ? void 0 : data.city) !== null && _c !== void 0 ? _c : null,
        isProxy: typeof privacy.proxy === "boolean" || typeof privacy.vpn === "boolean"
            ? Boolean(privacy.proxy || privacy.vpn)
            : null,
        isHosting: typeof privacy.hosting === "boolean" ? privacy.hosting : null,
        isTor: typeof privacy.tor === "boolean" ? privacy.tor : null,
    };
}
async function lookupIpapiCo(address, apiKey) {
    var _a, _b, _c;
    const url = apiKey
        ? `https://ipapi.co/${encodeURIComponent(address)}/json/?key=${encodeURIComponent(apiKey)}`
        : `https://ipapi.co/${encodeURIComponent(address)}/json/`;
    const data = await fetchJson(url);
    if (data === null || data === void 0 ? void 0 : data.error) {
        throw new Error(data.reason || "ipapi.co lookup failed");
    }
    return {
        countryCode: (0, countries_1.toAlpha2)(data === null || data === void 0 ? void 0 : data.country_code),
        countryName: (_a = data === null || data === void 0 ? void 0 : data.country_name) !== null && _a !== void 0 ? _a : null,
        region: (_b = data === null || data === void 0 ? void 0 : data.region) !== null && _b !== void 0 ? _b : null,
        city: (_c = data === null || data === void 0 ? void 0 : data.city) !== null && _c !== void 0 ? _c : null,
        isProxy: null,
        isHosting: null,
        isTor: null,
    };
}
async function callProvider(provider, address, apiKey) {
    switch (provider) {
        case "IP_API":
            return lookupIpApi(address, apiKey);
        case "IPINFO":
            return lookupIpInfo(address, apiKey);
        case "IPAPI_CO":
            return lookupIpapiCo(address, apiKey);
        default:
            throw new Error(`Unsupported geo lookup provider: ${provider}`);
    }
}
const MEMORY_CACHE_LIMIT = 20000;
const memoryCache = new Map();
const inFlight = new Set();
const failureBackoff = new Map();
const FAILURE_BACKOFF_MS = 60000;
const FAILURE_BACKOFF_LIMIT = 50000;
function cacheKey(address) {
    return `geo:ip:${address}`;
}
function readMemory(address) {
    const hit = memoryCache.get(address);
    if (!hit)
        return null;
    if (hit.expiresAt <= Date.now()) {
        memoryCache.delete(address);
        return null;
    }
    memoryCache.delete(address);
    memoryCache.set(address, hit);
    return hit.value;
}
function writeMemory(address, value, ttlSeconds) {
    if (memoryCache.size >= MEMORY_CACHE_LIMIT) {
        let toDrop = Math.ceil(MEMORY_CACHE_LIMIT * 0.1);
        for (const key of memoryCache.keys()) {
            memoryCache.delete(key);
            if (--toDrop <= 0)
                break;
        }
    }
    memoryCache.set(address, {
        value,
        expiresAt: Date.now() + ttlSeconds * 1000,
    });
}
function toLocation(result) {
    var _a;
    const code = result.countryCode;
    return {
        countryCode: code,
        countryName: code ? ((_a = (0, countries_1.getCountryName)(code)) !== null && _a !== void 0 ? _a : result.countryName) : null,
        region: result.region ? String(result.region).slice(0, 128) : null,
        city: result.city ? String(result.city).slice(0, 128) : null,
        source: "IP_LOOKUP",
        isProxy: result.isProxy,
        isHosting: result.isHosting,
        isTor: result.isTor,
        pending: false,
    };
}
async function warmLookup(address, policy) {
    if (inFlight.has(address))
        return null;
    inFlight.add(address);
    try {
        try {
            const cached = await redis.get(cacheKey(address));
            if (cached) {
                const parsed = JSON.parse(cached);
                writeMemory(address, parsed, policy.lookupCacheTtl);
                return parsed;
            }
        }
        catch (_a) {
        }
        const result = await callProvider(policy.lookupProvider, address, policy.lookupApiKey);
        const location = toLocation(result);
        writeMemory(address, location, policy.lookupCacheTtl);
        try {
            await redis.set(cacheKey(address), JSON.stringify(location), "EX", policy.lookupCacheTtl);
        }
        catch (_b) {
        }
        failureBackoff.delete(address);
        return location;
    }
    catch (error) {
        failureBackoff.delete(address);
        if (failureBackoff.size >= FAILURE_BACKOFF_LIMIT) {
            let toDrop = Math.ceil(FAILURE_BACKOFF_LIMIT * 0.1);
            for (const key of failureBackoff.keys()) {
                failureBackoff.delete(key);
                if (--toDrop <= 0)
                    break;
            }
        }
        failureBackoff.set(address, Date.now() + FAILURE_BACKOFF_MS);
        console_1.logger.debug("GEO", `IP lookup failed for ${address} via ${policy.lookupProvider}: ${error === null || error === void 0 ? void 0 : error.message}`);
        return null;
    }
    finally {
        inFlight.delete(address);
    }
}
function locationFromIpSync(address, policy) {
    if (policy.lookupProvider === "NONE")
        return null;
    if (!address || (0, ip_1.isPrivateIp)(address))
        return null;
    const cached = readMemory(address);
    if (cached)
        return cached;
    const backoffUntil = failureBackoff.get(address);
    if (backoffUntil !== undefined) {
        if (backoffUntil > Date.now())
            return null;
        failureBackoff.delete(address);
    }
    void warmLookup(address, policy);
    return { ...emptyLocation(), pending: true };
}
async function locationFromIp(address, policy) {
    if (policy.lookupProvider === "NONE")
        return null;
    if (!address || (0, ip_1.isPrivateIp)(address))
        return null;
    const cached = readMemory(address);
    if (cached)
        return cached;
    try {
        const stored = await redis.get(cacheKey(address));
        if (stored) {
            const parsed = JSON.parse(stored);
            writeMemory(address, parsed, policy.lookupCacheTtl);
            return parsed;
        }
    }
    catch (_a) {
    }
    return await warmLookup(address, policy);
}
function mergeLocation(primary, secondary) {
    var _a, _b, _c, _d, _e, _f, _g;
    if (!primary)
        return secondary;
    if (!secondary)
        return primary;
    return {
        countryCode: (_a = primary.countryCode) !== null && _a !== void 0 ? _a : secondary.countryCode,
        countryName: (_b = primary.countryName) !== null && _b !== void 0 ? _b : secondary.countryName,
        region: (_c = primary.region) !== null && _c !== void 0 ? _c : secondary.region,
        city: (_d = primary.city) !== null && _d !== void 0 ? _d : secondary.city,
        source: primary.countryCode ? primary.source : secondary.source,
        isProxy: (_e = primary.isProxy) !== null && _e !== void 0 ? _e : secondary.isProxy,
        isHosting: (_f = primary.isHosting) !== null && _f !== void 0 ? _f : secondary.isHosting,
        isTor: (_g = primary.isTor) !== null && _g !== void 0 ? _g : secondary.isTor,
        pending: primary.pending || secondary.pending,
    };
}
async function clearIpCache(address) {
    if (address) {
        memoryCache.delete(address);
        failureBackoff.delete(address);
        try {
            await redis.del(cacheKey(address));
        }
        catch (_a) {
        }
        return;
    }
    memoryCache.clear();
    failureBackoff.clear();
}
