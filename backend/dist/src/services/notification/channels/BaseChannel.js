"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseChannel = void 0;
const RedisCache_1 = require("../cache/RedisCache");
class BaseChannel {
    constructor(channelName) {
        this.channelName = channelName;
    }
    validate(operation) {
        if (!operation.userId) {
            throw new Error("userId is required");
        }
        if (!operation.data && !operation.template) {
            throw new Error("Either data or template must be provided");
        }
    }
    async trackDelivery(notificationId, status) {
        await RedisCache_1.redisCache.trackDelivery(notificationId, this.channelName, status);
    }
    getChannelName() {
        return this.channelName;
    }
    async isAvailableForUser(userId) {
        return true;
    }
    log(message, data) {
        const timestamp = new Date().toISOString();
        console.log(`[${this.channelName}] ${timestamp} - ${message}`, data ? JSON.stringify(data) : "");
    }
    logError(message, error) {
        const timestamp = new Date().toISOString();
        console.error(`[${this.channelName}] ${timestamp} - ERROR: ${message}`, error);
    }
}
exports.BaseChannel = BaseChannel;
