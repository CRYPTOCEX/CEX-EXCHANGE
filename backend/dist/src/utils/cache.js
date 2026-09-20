"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheManager = void 0;
const db_1 = require("@b/db");
const redis_1 = require("./redis");
const console_1 = require("./console");
const settings_bus_1 = require("./settings-bus");
const redis = redis_1.RedisSingleton.getInstance();
const INVALIDATE_CHANNEL = "cache:invalidate";
const CACHE_VERSION_KEY = "__cacheVersion";
const VERSION_POLL_MS = 5000;
class CacheManager {
    constructor() {
        this.settingsKey = "settings";
        this.extensionsKey = "extensions";
        this.settings = new Map();
        this.extensions = new Map();
        this.knownVersion = null;
        this.lastVersionCheckMs = 0;
        this.versionCheckInFlight = null;
        this.settingsLoadInFlight = null;
        this.extensionsLoadInFlight = null;
        this.initInvalidation();
    }
    initInvalidation() {
        (0, settings_bus_1.subscribe)(INVALIDATE_CHANNEL, (payload) => {
            this.settings.clear();
            this.extensions.clear();
            if (typeof (payload === null || payload === void 0 ? void 0 : payload.version) === "string")
                this.knownVersion = payload.version;
        });
    }
    async revalidateIfStale() {
        if ((0, settings_bus_1.isBusActive)())
            return;
        const now = Date.now();
        if (now - this.lastVersionCheckMs < VERSION_POLL_MS)
            return;
        if (this.versionCheckInFlight)
            return this.versionCheckInFlight;
        this.lastVersionCheckMs = now;
        this.versionCheckInFlight = (async () => {
            var _a;
            var _b;
            try {
                if (!((_a = db_1.models === null || db_1.models === void 0 ? void 0 : db_1.models.settings) === null || _a === void 0 ? void 0 : _a.findOne))
                    return;
                const row = await db_1.models.settings.findOne({
                    where: { key: CACHE_VERSION_KEY },
                    attributes: ["value"],
                });
                const version = (_b = row === null || row === void 0 ? void 0 : row.value) !== null && _b !== void 0 ? _b : "";
                if (this.knownVersion !== null && version !== this.knownVersion) {
                    this.settings.clear();
                    this.extensions.clear();
                    await this.loadSettingsFromDB();
                    await this.loadExtensionsFromDB();
                }
                this.knownVersion = version;
            }
            catch (_c) {
            }
            finally {
                this.versionCheckInFlight = null;
            }
        })();
        return this.versionCheckInFlight;
    }
    async announceInvalidation() {
        var _a;
        var _b;
        const version = `${Date.now()}.${Math.random().toString(36).slice(2, 8)}`;
        this.knownVersion = version;
        this.lastVersionCheckMs = Date.now();
        try {
            if ((_a = db_1.models === null || db_1.models === void 0 ? void 0 : db_1.models.settings) === null || _a === void 0 ? void 0 : _a.upsert) {
                await db_1.models.settings.upsert({ key: CACHE_VERSION_KEY, value: version });
            }
        }
        catch (error) {
            console_1.logger.warn("CACHE", `Cache version stamp write failed (other processes will converge only via pub/sub): ${(_b = error === null || error === void 0 ? void 0 : error.message) !== null && _b !== void 0 ? _b : error}`);
        }
        await (0, settings_bus_1.publish)(INVALIDATE_CHANNEL, { version });
    }
    static getInstance() {
        if (!CacheManager.instance) {
            CacheManager.instance = new CacheManager();
        }
        return CacheManager.instance;
    }
    async getSettings() {
        await this.revalidateIfStale();
        if (this.settings.size === 0) {
            if (!this.settingsLoadInFlight) {
                this.settingsLoadInFlight = (async () => {
                    try {
                        const cachedSettings = await this.getCache(this.settingsKey);
                        if (Object.keys(cachedSettings).length > 0) {
                            this.settings = new Map(Object.entries(cachedSettings));
                        }
                        else {
                            await this.loadSettingsFromDB();
                        }
                    }
                    catch (error) {
                        console_1.logger.error("CACHE", `Failed to load settings from cache: ${error.message}`, error);
                        await this.loadSettingsFromDB();
                    }
                })().finally(() => {
                    this.settingsLoadInFlight = null;
                });
            }
            await this.settingsLoadInFlight;
        }
        return this.settings;
    }
    async getExtensions() {
        await this.revalidateIfStale();
        if (this.extensions.size === 0) {
            if (!this.extensionsLoadInFlight) {
                this.extensionsLoadInFlight = (async () => {
                    try {
                        const cachedExtensions = await this.getCache(this.extensionsKey);
                        if (Object.keys(cachedExtensions).length > 0) {
                            this.extensions = new Map(Object.entries(cachedExtensions));
                        }
                        else {
                            await this.loadExtensionsFromDB();
                        }
                    }
                    catch (error) {
                        console_1.logger.error("CACHE", `Failed to load extensions from cache: ${error.message}`, error);
                        await this.loadExtensionsFromDB();
                    }
                })().finally(() => {
                    this.extensionsLoadInFlight = null;
                });
            }
            await this.extensionsLoadInFlight;
        }
        return this.extensions;
    }
    async getSetting(key) {
        const settings = await this.getSettings();
        return settings.get(key);
    }
    async getSettingBool(key, fallback = false) {
        const settings = await this.getSettings();
        if (!settings.has(key))
            return fallback;
        return CacheManager.toBool(settings.get(key), fallback);
    }
    async getSettingNumber(key, fallback, bounds) {
        const settings = await this.getSettings();
        if (!settings.has(key))
            return fallback;
        return CacheManager.toNumber(settings.get(key), fallback, bounds);
    }
    static toNumber(value, fallback, bounds) {
        const parsed = typeof value === "number" ? value : Number(String(value !== null && value !== void 0 ? value : "").trim());
        const usable = Number.isFinite(parsed) && String(value !== null && value !== void 0 ? value : "").trim() !== "" ? parsed : fallback;
        if ((bounds === null || bounds === void 0 ? void 0 : bounds.min) !== undefined && usable < bounds.min)
            return bounds.min;
        if ((bounds === null || bounds === void 0 ? void 0 : bounds.max) !== undefined && usable > bounds.max)
            return bounds.max;
        return usable;
    }
    static toBool(value, fallback = false) {
        if (typeof value === "boolean")
            return value;
        if (typeof value === "number")
            return value !== 0;
        if (typeof value === "string") {
            const normalized = value.trim().toLowerCase();
            if (["true", "1", "yes", "on"].includes(normalized))
                return true;
            if (["false", "0", "no", "off", ""].includes(normalized))
                return false;
        }
        if (value === null || value === undefined)
            return fallback;
        return Boolean(value);
    }
    async updateSetting(key, value, syncToDB = false) {
        if (this.settings.size === 0) {
            await this.getSettings();
        }
        const serialized = JSON.stringify(value);
        const changed = JSON.stringify(this.settings.get(key)) !== serialized;
        this.settings.set(key, value);
        try {
            await redis.hset(this.settingsKey, key, serialized);
        }
        catch (error) {
            console_1.logger.warn("CACHE", `Skipped settings cache write (${error.message})`);
        }
        if (syncToDB) {
            await db_1.models.settings.upsert({ key, value });
        }
        if (changed)
            await this.announceInvalidation();
    }
    async updateExtension(name, data, syncToDB = false) {
        if (this.extensions.size === 0) {
            await this.getExtensions();
        }
        const serialized = JSON.stringify(data);
        const changed = JSON.stringify(this.extensions.get(name)) !== serialized;
        this.extensions.set(name, data);
        try {
            await redis.hset(this.extensionsKey, name, serialized);
        }
        catch (error) {
            console_1.logger.warn("CACHE", `Skipped extensions cache write (${error.message})`);
        }
        if (syncToDB) {
            await db_1.models.extension.upsert({ name, ...data });
        }
        if (changed)
            await this.announceInvalidation();
    }
    async loadSettingsFromDB() {
        var _a;
        if (!((_a = db_1.models === null || db_1.models === void 0 ? void 0 : db_1.models.settings) === null || _a === void 0 ? void 0 : _a.findAll)) {
            console_1.logger.warn("CACHE", "Settings model not available, skipping settings cache load");
            return;
        }
        const settingsData = await db_1.models.settings.findAll();
        const pipeline = redis.pipeline();
        settingsData.forEach((setting) => {
            if (setting.key === CACHE_VERSION_KEY)
                return;
            this.settings.set(setting.key, setting.value);
            pipeline.hset(this.settingsKey, setting.key, JSON.stringify(setting.value));
        });
        await pipeline.exec();
    }
    async loadExtensionsFromDB() {
        var _a;
        if (!((_a = db_1.models === null || db_1.models === void 0 ? void 0 : db_1.models.extension) === null || _a === void 0 ? void 0 : _a.findAll)) {
            console_1.logger.warn("CACHE", "Extension model not available, skipping extension cache load");
            return;
        }
        const extensionsData = await db_1.models.extension.findAll({
            where: { status: true },
        });
        const pipeline = redis.pipeline();
        extensionsData.forEach((extension) => {
            this.extensions.set(extension.name, extension);
            pipeline.hset(this.extensionsKey, extension.name, JSON.stringify(extension));
        });
        await pipeline.exec();
    }
    async getCache(key) {
        const cachedData = await redis.hgetall(key);
        return Object.keys(cachedData).reduce((acc, field) => {
            acc[field] = JSON.parse(cachedData[field]);
            return acc;
        }, {});
    }
    async clearCache() {
        try {
            this.settings.clear();
            this.extensions.clear();
            await redis.del(this.settingsKey, this.extensionsKey);
            await this.loadSettingsFromDB();
            await this.loadExtensionsFromDB();
            await this.announceInvalidation();
        }
        catch (error) {
            console_1.logger.error("CACHE", `Cache clear and reload failed: ${error.message}`, error);
            throw error;
        }
    }
}
exports.CacheManager = CacheManager;
CacheManager.VERSION_KEY = CACHE_VERSION_KEY;
