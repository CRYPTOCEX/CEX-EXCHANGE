"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BinarySettingsCache = exports.binarySettingsCache = exports.BINARY_SETTINGS_CHANNEL = void 0;
exports.getBinarySettings = getBinarySettings;
exports.invalidateBinarySettingsCache = invalidateBinarySettingsCache;
const db_1 = require("@b/db");
const utils_1 = require("@b/api/admin/finance/binary/settings/utils");
const settings_bus_1 = require("@b/utils/settings-bus");
exports.BINARY_SETTINGS_CHANNEL = "cache:invalidate:binary-settings";
class BinarySettingsCache {
    constructor(ttlMs = 60000) {
        this.cache = null;
        this.lastFetch = 0;
        this.fetchPromise = null;
        this.busSubscribed = false;
        this.configuredTtl = ttlMs;
    }
    ttl() {
        return (0, settings_bus_1.busTtl)(this.configuredTtl);
    }
    ensureBusSubscription() {
        if (this.busSubscribed)
            return;
        this.busSubscribed = true;
        (0, settings_bus_1.subscribe)(exports.BINARY_SETTINGS_CHANNEL, () => this.invalidate());
    }
    async get() {
        this.ensureBusSubscription();
        if (this.cache && Date.now() - this.lastFetch < this.ttl()) {
            return this.cache;
        }
        if (this.fetchPromise) {
            return this.fetchPromise;
        }
        this.fetchPromise = this.fetchFromDB();
        try {
            const settings = await this.fetchPromise;
            this.cache = settings;
            this.lastFetch = Date.now();
            return settings;
        }
        finally {
            this.fetchPromise = null;
        }
    }
    async fetchFromDB() {
        try {
            const settingsRecord = await db_1.models.settings.findOne({
                where: { key: "binarySettings" },
            });
            if (settingsRecord === null || settingsRecord === void 0 ? void 0 : settingsRecord.value) {
                try {
                    const parsed = JSON.parse(settingsRecord.value);
                    return (0, utils_1.mergeWithDefaults)(parsed);
                }
                catch (parseError) {
                    console.error("Failed to parse binary settings:", parseError);
                    return utils_1.DEFAULT_BINARY_SETTINGS;
                }
            }
            return utils_1.DEFAULT_BINARY_SETTINGS;
        }
        catch (error) {
            console.error("Failed to fetch binary settings from DB:", error);
            return utils_1.DEFAULT_BINARY_SETTINGS;
        }
    }
    invalidate() {
        this.cache = null;
        this.lastFetch = 0;
    }
    async invalidateEverywhere() {
        this.ensureBusSubscription();
        this.invalidate();
        await (0, settings_bus_1.publish)(exports.BINARY_SETTINGS_CHANNEL);
    }
    async refresh() {
        this.invalidate();
        return this.get();
    }
    isValid() {
        return this.cache !== null && Date.now() - this.lastFetch < this.ttl();
    }
    getAge() {
        if (!this.cache)
            return Infinity;
        return Date.now() - this.lastFetch;
    }
}
exports.BinarySettingsCache = BinarySettingsCache;
exports.binarySettingsCache = new BinarySettingsCache();
async function getBinarySettings() {
    return exports.binarySettingsCache.get();
}
async function invalidateBinarySettingsCache() {
    await exports.binarySettingsCache.invalidateEverywhere();
}
