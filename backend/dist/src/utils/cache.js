"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheManager = void 0;
const db_1 = require("@b/db");
const redis_1 = require("./redis");
const console_1 = require("./console");
const redis = redis_1.RedisSingleton.getInstance();
class CacheManager {
    constructor() {
        this.settingsKey = "settings";
        this.extensionsKey = "extensions";
        this.settings = new Map();
        this.extensions = new Map();
    }
    static getInstance() {
        if (!CacheManager.instance) {
            CacheManager.instance = new CacheManager();
        }
        return CacheManager.instance;
    }
    async getSettings() {
        if (this.settings.size === 0) {
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
                console_1.logger.error("CACHE", `Failed to load settings: ${error.message}`, error);
                throw error;
            }
        }
        return this.settings;
    }
    async getExtensions() {
        if (this.extensions.size === 0) {
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
                console_1.logger.error("CACHE", `Failed to load extensions: ${error.message}`, error);
                throw error;
            }
        }
        return this.extensions;
    }
    async getSetting(key) {
        const settings = await this.getSettings();
        return settings.get(key);
    }
    async updateSetting(key, value, syncToDB = false) {
        if (this.settings.size === 0) {
            await this.getSettings();
        }
        this.settings.set(key, value);
        await redis.hset(this.settingsKey, key, JSON.stringify(value));
        if (syncToDB) {
            await db_1.models.settings.upsert({ key, value });
        }
    }
    async updateExtension(name, data, syncToDB = false) {
        if (this.extensions.size === 0) {
            await this.getExtensions();
        }
        this.extensions.set(name, data);
        await redis.hset(this.extensionsKey, name, JSON.stringify(data));
        if (syncToDB) {
            await db_1.models.extension.upsert({ name, ...data });
        }
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
        }
        catch (error) {
            console_1.logger.error("CACHE", `Cache clear and reload failed: ${error.message}`, error);
            throw error;
        }
    }
}
exports.CacheManager = CacheManager;
