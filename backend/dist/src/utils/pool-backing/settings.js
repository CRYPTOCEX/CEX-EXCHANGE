"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POOL_BACKING_DEFAULTS = exports.POOL_BACKING_SETTING_KEYS = void 0;
exports.parsePoolBackingSettings = parsePoolBackingSettings;
exports.parseMasterReserve = parseMasterReserve;
exports.getPoolBackingSettings = getPoolBackingSettings;
exports.forgetPoolBackingSettings = forgetPoolBackingSettings;
exports.ensurePoolBackingSettings = ensurePoolBackingSettings;
const db_1 = require("@b/db");
const console_1 = require("@b/utils/console");
const networks_1 = require("./networks");
exports.POOL_BACKING_SETTING_KEYS = [
    "poolBackingMode",
    "poolBackingCapUsd",
    "poolBackingThresholdUsd",
    "poolBackingPause",
    "poolBackingDriftRuns",
    "poolBackingAlertUsd",
    "poolBackingMaxSettlementUsd",
    "poolBackingMasterReserve",
    "poolBackingCustodyReadsPerRun",
    "poolBackingAutoConvert",
];
exports.POOL_BACKING_DEFAULTS = {
    mode: "monitor",
    capUsd: null,
    thresholdUsd: 50,
    paused: false,
    driftRuns: 3,
    alertUsd: null,
    maxSettlementUsd: 10000,
    masterReserve: {},
    custodyReadsPerRun: 50,
    autoConvert: false,
};
const MODES = ["off", "monitor", "manual", "auto"];
function toBool(value, fallback) {
    if (value === undefined || value === null || value === "")
        return fallback;
    if (typeof value === "boolean")
        return value;
    const s = String(value).trim().toLowerCase();
    if (s === "true" || s === "1" || s === "yes" || s === "on")
        return true;
    if (s === "false" || s === "0" || s === "no" || s === "off")
        return false;
    return fallback;
}
function toNumber(value, fallback) {
    if (value === undefined || value === null || value === "")
        return fallback;
    const n = Number(value);
    return Number.isFinite(n) && n >= 0 ? n : fallback;
}
function parsePoolBackingSettings(rows) {
    var _a, _b, _c;
    const rawMode = String((_a = rows.get("poolBackingMode")) !== null && _a !== void 0 ? _a : "").trim().toLowerCase();
    const mode = MODES.includes(rawMode) ? rawMode : exports.POOL_BACKING_DEFAULTS.mode;
    const driftRuns = toNumber(rows.get("poolBackingDriftRuns"), exports.POOL_BACKING_DEFAULTS.driftRuns);
    return {
        mode,
        capUsd: toNumber(rows.get("poolBackingCapUsd"), null),
        thresholdUsd: (_b = toNumber(rows.get("poolBackingThresholdUsd"), exports.POOL_BACKING_DEFAULTS.thresholdUsd)) !== null && _b !== void 0 ? _b : exports.POOL_BACKING_DEFAULTS.thresholdUsd,
        paused: toBool(rows.get("poolBackingPause"), false),
        driftRuns: Math.max(1, Math.floor(driftRuns !== null && driftRuns !== void 0 ? driftRuns : exports.POOL_BACKING_DEFAULTS.driftRuns)),
        alertUsd: toNumber(rows.get("poolBackingAlertUsd"), null),
        maxSettlementUsd: parseMaxSettlementUsd(rows),
        masterReserve: parseMasterReserve(rows.get("poolBackingMasterReserve")),
        custodyReadsPerRun: Math.max(0, Math.floor((_c = toNumber(rows.get("poolBackingCustodyReadsPerRun"), exports.POOL_BACKING_DEFAULTS.custodyReadsPerRun)) !== null && _c !== void 0 ? _c : exports.POOL_BACKING_DEFAULTS.custodyReadsPerRun)),
        autoConvert: toBool(rows.get("poolBackingAutoConvert"), false),
    };
}
function parseMasterReserve(raw) {
    let value = raw;
    for (let pass = 0; pass < 2 && typeof value === "string"; pass++) {
        const text = value.trim();
        if (text === "")
            return {};
        try {
            value = JSON.parse(text);
        }
        catch (_a) {
            return {};
        }
    }
    if (!value || typeof value !== "object" || Array.isArray(value))
        return {};
    const out = {};
    const unknown = [];
    for (const [chain, amount] of Object.entries(value)) {
        const n = Number(amount);
        const typed = String(chain).trim().toUpperCase();
        if (!typed || !Number.isFinite(n) || n < 0)
            continue;
        const key = (0, networks_1.canonicalChainName)(typed);
        if (!(0, networks_1.isKnownEcosystemChain)(key))
            unknown.push(typed);
        out[key] = key in out ? Math.max(out[key], n) : n;
    }
    if (unknown.length) {
        console_1.logger.warn("POOL_BACKING", `poolBackingMasterReserve names ${unknown.join(", ")}: not an ecosystem chain name (ETH, BSC, TRON, SOL, XMR, …); the entry is kept but no signer will look it up`);
    }
    return out;
}
function parseMaxSettlementUsd(rows) {
    if (!rows.has("poolBackingMaxSettlementUsd"))
        return exports.POOL_BACKING_DEFAULTS.maxSettlementUsd;
    const raw = rows.get("poolBackingMaxSettlementUsd");
    if (raw === undefined || raw === null || String(raw).trim() === "")
        return null;
    return toNumber(raw, exports.POOL_BACKING_DEFAULTS.maxSettlementUsd);
}
const CACHE_TTL_MS = 15000;
let cached = null;
async function getPoolBackingSettings(options = {}) {
    if (!options.fresh && cached && Date.now() - cached.at < CACHE_TTL_MS)
        return cached.value;
    const rows = new Map();
    try {
        const found = await db_1.models.settings.findAll({
            where: { key: [...exports.POOL_BACKING_SETTING_KEYS] },
            attributes: ["key", "value"],
            raw: true,
        });
        for (const row of found)
            rows.set(String(row.key), row.value);
    }
    catch (error) {
        console_1.logger.warn("POOL_BACKING", `Settings read failed, using defaults: ${(error === null || error === void 0 ? void 0 : error.message) || error}`);
    }
    const value = parsePoolBackingSettings(rows);
    cached = { at: Date.now(), value };
    return value;
}
function forgetPoolBackingSettings() {
    cached = null;
}
let ensurePromise = null;
async function ensurePoolBackingSettings() {
    if (ensurePromise)
        return ensurePromise;
    ensurePromise = (async () => {
        try {
            const existing = await db_1.models.settings.findOne({
                where: { key: "poolBackingMode" },
                attributes: ["key"],
                raw: true,
            });
            if (!existing) {
                await db_1.models.settings.create({ key: "poolBackingMode", value: exports.POOL_BACKING_DEFAULTS.mode });
                console_1.logger.info("POOL_BACKING", `poolBackingMode materialised as "${exports.POOL_BACKING_DEFAULTS.mode}"`);
                try {
                    const { CacheManager } = require("@b/utils/cache");
                    await CacheManager.getInstance().clearCache();
                }
                catch (error) {
                    console_1.logger.warn("POOL_BACKING", `Settings cache not flushed: ${(error === null || error === void 0 ? void 0 : error.message) || error}`);
                }
            }
        }
        catch (error) {
            ensurePromise = null;
            console_1.logger.warn("POOL_BACKING", `ensurePoolBackingSettings failed: ${(error === null || error === void 0 ? void 0 : error.message) || error}`);
        }
    })();
    return ensurePromise;
}
