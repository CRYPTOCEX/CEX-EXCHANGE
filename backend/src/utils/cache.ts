import { models } from "@b/db"; // Adjust import path as needed
import { RedisSingleton } from "./redis";
import logger from "@b/utils/logger";

const redis = RedisSingleton.getInstance();

export class CacheManager {
  private static instance: CacheManager;

  private readonly settingsKey = "settings";
  private readonly extensionsKey = "extensions";

  // Maps to store settings and extensions for quick access
  private settings = new Map<string, any>();
  private extensions = new Map<string, any>();

  // Private constructor to prevent direct instantiation
  private constructor() {}

  // Public method to provide access to the singleton instance
  public static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  // Load settings from Map, Redis, or DB if necessary
  public async getSettings(): Promise<Map<string, any>> {
    if (this.settings.size === 0) {
      try {
        const cachedSettings = await this.getCache(this.settingsKey);
        if (Object.keys(cachedSettings).length > 0) {
          this.settings = new Map(Object.entries(cachedSettings));
        } else {
          await this.loadSettingsFromDB();
        }
      } catch (error) {
        logger(
          "error",
          "CacheManager",
          __filename,
          `Failed to load settings: ${error.message}`
        );
        throw error;
      }
    }
    return this.settings;
  }

  // Load extensions from Map, Redis, or DB if necessary
  public async getExtensions(): Promise<Map<string, any>> {
    if (this.extensions.size === 0) {
      try {
        const cachedExtensions = await this.getCache(this.extensionsKey);
        if (Object.keys(cachedExtensions).length > 0) {
          this.extensions = new Map(Object.entries(cachedExtensions));
        } else {
          await this.loadExtensionsFromDB();
        }
      } catch (error) {
        logger(
          "error",
          "CacheManager",
          __filename,
          `Failed to load extensions: ${error.message}`
        );
        throw error;
      }
    }
    return this.extensions;
  }

  // Get a specific setting from the Map
  public async getSetting(key: string): Promise<any> {
    const settings = await this.getSettings();
    return settings.get(key);
  }

  // Update a setting in both the Map and Redis cache, and optionally sync to DB
  public async updateSetting(
    key: string,
    value: any,
    syncToDB = false
  ): Promise<void> {
    this.settings.set(key, value);

    await redis.hset(this.settingsKey, key, JSON.stringify(value));
    if (syncToDB) {
      await models.settings.upsert({ key, value });
    }
  }

  // Update an extension in both the Map and Redis cache, and optionally sync to DB
  public async updateExtension(
    name: string,
    data: any,
    syncToDB = false
  ): Promise<void> {
    this.extensions.set(name, data);

    await redis.hset(this.extensionsKey, name, JSON.stringify(data));
    if (syncToDB) {
      await models.extension.upsert({ name, ...data });
    }
  }

  // Load settings from DB, populate Map, and update Redis cache
  private async loadSettingsFromDB(): Promise<void> {
    const settingsData = await models.settings.findAll();
    const pipeline = redis.pipeline();

    settingsData.forEach((setting) => {
      this.settings.set(setting.key, setting.value);
      pipeline.hset(
        this.settingsKey,
        setting.key,
        JSON.stringify(setting.value)
      );
    });

    await pipeline.exec();
  }

  // Load extensions from DB, populate Map, and update Redis cache
  private async loadExtensionsFromDB(): Promise<void> {
    const extensionsData = await models.extension.findAll({
      where: { status: true },
    });
    const pipeline = redis.pipeline();

    extensionsData.forEach((extension) => {
      this.extensions.set(extension.name, extension);
      pipeline.hset(
        this.extensionsKey,
        extension.name,
        JSON.stringify(extension)
      );
    });

    await pipeline.exec();
  }

  // Helper method to retrieve all data from Redis cache and parse it into an object
  private async getCache(key: string): Promise<Record<string, any>> {
    const cachedData = await redis.hgetall(key);
    return Object.keys(cachedData).reduce(
      (acc, field) => {
        acc[field] = JSON.parse(cachedData[field]);
        return acc;
      },
      {} as Record<string, any>
    );
  }

  // Method to clear both Map and Redis cache for settings and extensions
  public async clearCache() {
    try {
      // Clear the in-memory Maps
      this.settings.clear();
      this.extensions.clear();

      // Clear the Redis cache
      await redis.del(this.settingsKey, this.extensionsKey);

      // Reload settings and extensions from the database and update the caches
      await this.loadSettingsFromDB();
      await this.loadExtensionsFromDB();

      console.log(
        "Settings & Extensions Cache cleared and reloaded successfully"
      );
    } catch (error) {
      logger(
        "error",
        "CacheManager",
        __filename,
        `Cache clear and reload failed: ${error.message}`
      );
      throw error;
    }
  }
}
