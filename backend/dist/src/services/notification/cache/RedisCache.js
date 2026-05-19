"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.redisCache = exports.RedisCache = void 0;
const redis_1 = require("@b/utils/redis");
class RedisCache {
    constructor() {
        this.redis = redis_1.RedisSingleton.getInstance();
    }
    static getInstance() {
        if (!RedisCache.instance) {
            RedisCache.instance = new RedisCache();
        }
        return RedisCache.instance;
    }
    getClient() {
        return this.redis;
    }
    async getUserPreferences(userId) {
        try {
            const cached = await this.redis.get(`user:prefs:${userId}`);
            return cached ? JSON.parse(cached) : null;
        }
        catch (error) {
            console.error(`[RedisCache] Error getting user preferences for ${userId}:`, error);
            return null;
        }
    }
    async setUserPreferences(userId, prefs) {
        try {
            await this.redis.setex(`user:prefs:${userId}`, 3600, JSON.stringify(prefs));
        }
        catch (error) {
            console.error(`[RedisCache] Error setting user preferences for ${userId}:`, error);
        }
    }
    async clearUserPreferences(userId) {
        try {
            await this.redis.del(`user:prefs:${userId}`);
        }
        catch (error) {
            console.error(`[RedisCache] Error clearing user preferences for ${userId}:`, error);
        }
    }
    async checkIdempotency(key) {
        try {
            return await this.redis.get(`notif:idem:${key}`);
        }
        catch (error) {
            console.error(`[RedisCache] Error checking idempotency for ${key}:`, error);
            return null;
        }
    }
    async setIdempotency(key, notificationId) {
        try {
            await this.redis.setex(`notif:idem:${key}`, 24 * 3600, notificationId);
        }
        catch (error) {
            console.error(`[RedisCache] Error setting idempotency for ${key}:`, error);
        }
    }
    async trackDelivery(notificationId, channel, status) {
        try {
            const key = `notif:delivery:${notificationId}`;
            const existing = await this.redis.get(key);
            const data = existing ? JSON.parse(existing) : {};
            data[channel] = {
                ...status,
                timestamp: new Date().toISOString(),
            };
            await this.redis.setex(key, 30 * 24 * 3600, JSON.stringify(data));
        }
        catch (error) {
            console.error(`[RedisCache] Error tracking delivery for ${notificationId}:`, error);
        }
    }
    async getDeliveryStatus(notificationId) {
        try {
            const data = await this.redis.get(`notif:delivery:${notificationId}`);
            return data ? JSON.parse(data) : null;
        }
        catch (error) {
            console.error(`[RedisCache] Error getting delivery status for ${notificationId}:`, error);
            return null;
        }
    }
    async incrementStat(metric, value = 1) {
        try {
            await this.redis.hincrby("notif:stats:hourly", metric, value);
            const ttl = await this.redis.ttl("notif:stats:hourly");
            if (ttl === -1) {
                await this.redis.expire("notif:stats:hourly", 3600);
            }
        }
        catch (error) {
            console.error(`[RedisCache] Error incrementing stat ${metric}:`, error);
        }
    }
    async getStats() {
        try {
            const stats = await this.redis.hgetall("notif:stats:hourly");
            return stats || {};
        }
        catch (error) {
            console.error("[RedisCache] Error getting stats:", error);
            return {};
        }
    }
    async getFormattedMetrics() {
        const stats = await this.getStats();
        const sent = parseInt(stats.sent || "0");
        const failed = parseInt(stats.failed || "0");
        const total = sent + failed;
        const successRate = total > 0 ? (sent / total) * 100 : 0;
        const channels = {};
        for (const [key, value] of Object.entries(stats)) {
            if (key.startsWith("channels:")) {
                const channel = key.replace("channels:", "");
                channels[channel] = parseInt(value);
            }
        }
        return {
            sent,
            failed,
            successRate: parseFloat(successRate.toFixed(2)),
            channels,
        };
    }
    async resetHourlyStats() {
        try {
            await this.redis.del("notif:stats:hourly");
        }
        catch (error) {
            console.error("[RedisCache] Error resetting stats:", error);
        }
    }
    async isConnected() {
        try {
            await this.redis.ping();
            return true;
        }
        catch (error) {
            return false;
        }
    }
    async getCacheHitRate() {
        try {
            const info = await this.redis.info("stats");
            const matches = info.match(/keyspace_hits:(\d+)/);
            const hits = matches ? parseInt(matches[1]) : 0;
            const missesMatch = info.match(/keyspace_misses:(\d+)/);
            const misses = missesMatch ? parseInt(missesMatch[1]) : 0;
            const total = hits + misses;
            return total > 0 ? (hits / total) * 100 : 0;
        }
        catch (error) {
            console.error("[RedisCache] Error getting hit rate:", error);
            return 0;
        }
    }
    async close() {
    }
}
exports.RedisCache = RedisCache;
exports.redisCache = RedisCache.getInstance();
