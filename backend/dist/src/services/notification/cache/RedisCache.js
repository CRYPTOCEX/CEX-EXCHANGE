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
    async claimIdempotency(key) {
        try {
            const ok = await this.redis.set(`notif:idem:${key}`, RedisCache.IN_FLIGHT, "EX", RedisCache.CLAIM_TTL_SECONDS, "NX");
            if (ok === "OK")
                return { claimed: true };
            const existing = await this.redis.get(`notif:idem:${key}`);
            if (existing === RedisCache.IN_FLIGHT) {
                return { claimed: false, inFlight: true };
            }
            return { claimed: false, existingId: existing !== null && existing !== void 0 ? existing : undefined };
        }
        catch (error) {
            console.error(`[RedisCache] Error claiming idempotency for ${key}:`, error);
            return { claimed: true };
        }
    }
    async releaseIdempotency(key) {
        try {
            const current = await this.redis.get(`notif:idem:${key}`);
            if (current === RedisCache.IN_FLIGHT) {
                await this.redis.del(`notif:idem:${key}`);
            }
        }
        catch (error) {
            console.error(`[RedisCache] Error releasing idempotency for ${key}:`, error);
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
    deliveryKey(notificationId) {
        return `notif:delivery:v2:${notificationId}`;
    }
    async trackDelivery(notificationId, channel, status) {
        try {
            const key = this.deliveryKey(notificationId);
            await this.redis
                .pipeline()
                .hset(key, channel, JSON.stringify({ ...status, timestamp: new Date().toISOString() }))
                .expire(key, RedisCache.DELIVERY_TTL_SECONDS)
                .exec();
        }
        catch (error) {
            console.error(`[RedisCache] Error tracking delivery for ${notificationId}:`, error);
        }
    }
    async getDeliveryStatus(notificationId) {
        try {
            const raw = await this.redis.hgetall(this.deliveryKey(notificationId));
            if (!raw || Object.keys(raw).length === 0)
                return null;
            const data = {};
            for (const [channel, value] of Object.entries(raw)) {
                try {
                    data[channel] = JSON.parse(value);
                }
                catch (_a) {
                }
            }
            return data;
        }
        catch (error) {
            console.error(`[RedisCache] Error getting delivery status for ${notificationId}:`, error);
            return null;
        }
    }
    async incrementStats(entries) {
        const pairs = Object.entries(entries).filter(([, value]) => value > 0);
        if (!pairs.length)
            return;
        try {
            const pipeline = this.redis.pipeline();
            for (const [metric, value] of pairs) {
                pipeline.hincrby(RedisCache.STATS_KEY, metric, value);
            }
            pipeline.expire(RedisCache.STATS_KEY, 3600);
            await pipeline.exec();
        }
        catch (error) {
            console.error("[RedisCache] Error incrementing stats:", error);
        }
    }
    async incrementStat(metric, value = 1) {
        await this.incrementStats({ [metric]: value });
    }
    async getStats() {
        try {
            const stats = await this.redis.hgetall(RedisCache.STATS_KEY);
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
        const failedByChannel = {};
        for (const [key, value] of Object.entries(stats)) {
            if (key.startsWith("channels_failed:")) {
                const channel = key.replace("channels_failed:", "");
                failedByChannel[channel] = parseInt(value);
            }
            else if (key.startsWith("channels:")) {
                const channel = key.replace("channels:", "");
                channels[channel] = parseInt(value);
            }
        }
        return {
            sent,
            failed,
            successRate: parseFloat(successRate.toFixed(2)),
            channels,
            failedByChannel,
        };
    }
    async resetHourlyStats() {
        try {
            await this.redis.del(RedisCache.STATS_KEY);
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
RedisCache.IN_FLIGHT = "__in_flight__";
RedisCache.CLAIM_TTL_SECONDS = 120;
RedisCache.DELIVERY_TTL_SECONDS = 30 * 24 * 3600;
RedisCache.STATS_KEY = "notif:stats:hourly";
exports.redisCache = RedisCache.getInstance();
