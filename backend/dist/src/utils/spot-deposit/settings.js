"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_SPOT_DEPOSIT_MODE = exports.SPOT_DEPOSIT_MODE_KEY = exports.SPOT_DEPOSIT_MODES = void 0;
exports.parseSpotDepositMode = parseSpotDepositMode;
exports.getSpotDepositMode = getSpotDepositMode;
exports.forgetSpotDepositMode = forgetSpotDepositMode;
exports.ensureSpotDepositMode = ensureSpotDepositMode;
const db_1 = require("@b/db");
const console_1 = require("@b/utils/console");
exports.SPOT_DEPOSIT_MODES = ["hash_claim", "amount_match", "ecosystem_custody"];
exports.SPOT_DEPOSIT_MODE_KEY = "spotDepositMode";
exports.DEFAULT_SPOT_DEPOSIT_MODE = "hash_claim";
function parseSpotDepositMode(raw) {
    const s = String(raw !== null && raw !== void 0 ? raw : "").trim().toLowerCase();
    return exports.SPOT_DEPOSIT_MODES.includes(s) ? s : exports.DEFAULT_SPOT_DEPOSIT_MODE;
}
const CACHE_TTL_MS = 15000;
let cached = null;
async function getSpotDepositMode(options = {}) {
    if (!options.fresh && cached && Date.now() - cached.at < CACHE_TTL_MS)
        return cached.value;
    let value = exports.DEFAULT_SPOT_DEPOSIT_MODE;
    try {
        const row = (await db_1.models.settings.findOne({
            where: { key: exports.SPOT_DEPOSIT_MODE_KEY },
            attributes: ["key", "value"],
            raw: true,
        }));
        value = parseSpotDepositMode(row === null || row === void 0 ? void 0 : row.value);
    }
    catch (error) {
        console_1.logger.warn("SPOT_DEPOSIT", `spotDepositMode read failed, using "${exports.DEFAULT_SPOT_DEPOSIT_MODE}": ${(error === null || error === void 0 ? void 0 : error.message) || error}`);
    }
    cached = { at: Date.now(), value };
    return value;
}
function forgetSpotDepositMode() {
    cached = null;
}
let ensurePromise = null;
async function ensureSpotDepositMode() {
    if (ensurePromise)
        return ensurePromise;
    ensurePromise = (async () => {
        try {
            const existing = await db_1.models.settings.findOne({
                where: { key: exports.SPOT_DEPOSIT_MODE_KEY },
                attributes: ["key"],
                raw: true,
            });
            if (!existing) {
                await db_1.models.settings.create({ key: exports.SPOT_DEPOSIT_MODE_KEY, value: exports.DEFAULT_SPOT_DEPOSIT_MODE });
                console_1.logger.info("SPOT_DEPOSIT", `${exports.SPOT_DEPOSIT_MODE_KEY} materialised as "${exports.DEFAULT_SPOT_DEPOSIT_MODE}"`);
                try {
                    const { CacheManager } = require("@b/utils/cache");
                    await CacheManager.getInstance().clearCache();
                }
                catch (error) {
                    console_1.logger.warn("SPOT_DEPOSIT", `Settings cache not flushed: ${(error === null || error === void 0 ? void 0 : error.message) || error}`);
                }
            }
        }
        catch (error) {
            ensurePromise = null;
            console_1.logger.warn("SPOT_DEPOSIT", `ensureSpotDepositMode failed: ${(error === null || error === void 0 ? void 0 : error.message) || error}`);
        }
    })();
    return ensurePromise;
}
