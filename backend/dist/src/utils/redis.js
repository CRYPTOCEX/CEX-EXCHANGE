"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.redlock = exports.redisClient = exports.RedlockSingleton = exports.RedisSingleton = void 0;
exports.default = default_1;
const ioredis_1 = require("ioredis");
const redlock_1 = __importDefault(require("redlock"));
const console_1 = require("./console");
class RedisSingleton {
    constructor() { }
    static getInstance() {
        if (!RedisSingleton.instance) {
            if (RedisSingleton.isConnecting) {
                return new Promise((resolve) => {
                    const checkConnection = () => {
                        if (RedisSingleton.instance) {
                            resolve(RedisSingleton.instance);
                        }
                        else {
                            setTimeout(checkConnection, 10);
                        }
                    };
                    checkConnection();
                });
            }
            RedisSingleton.isConnecting = true;
            try {
                RedisSingleton.instance = new ioredis_1.Redis({
                    host: process.env.REDIS_HOST || "127.0.0.1",
                    port: parseInt(process.env.REDIS_PORT || "6379"),
                    password: process.env.REDIS_PASSWORD,
                    db: parseInt(process.env.REDIS_DB || "0"),
                    maxRetriesPerRequest: 3,
                    enableReadyCheck: true,
                    connectTimeout: 5000,
                    commandTimeout: 5000,
                    lazyConnect: true,
                    family: 4,
                    keepAlive: 30000,
                });
                RedisSingleton.instance.on("error", (error) => {
                    console_1.logger.error("REDIS", `✗ Error: ${error.message}`);
                });
            }
            catch (error) {
                console_1.logger.error("REDIS", `Failed to create Redis instance: ${error}`);
                throw error;
            }
            finally {
                RedisSingleton.isConnecting = false;
            }
        }
        return RedisSingleton.instance;
    }
    static async safeGet(key, timeoutMs = 3000) {
        const redis = this.getInstance();
        return Promise.race([
            redis.get(key),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Redis GET timeout')), timeoutMs))
        ]).catch((error) => {
            console_1.logger.error("REDIS", `GET error for key ${key}: ${error}`);
            return null;
        });
    }
    static async safeSet(key, value, timeoutMs = 3000) {
        const redis = this.getInstance();
        return Promise.race([
            redis.set(key, value).then(() => true),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Redis SET timeout')), timeoutMs))
        ]).catch((error) => {
            console_1.logger.error("REDIS", `SET error for key ${key}: ${error}`);
            return false;
        });
    }
    static async cleanup() {
        if (RedisSingleton.instance) {
            try {
                await RedisSingleton.instance.quit();
            }
            catch (error) {
                console_1.logger.error("REDIS", `Error during cleanup: ${error}`);
            }
            RedisSingleton.instance = null;
        }
    }
}
exports.RedisSingleton = RedisSingleton;
RedisSingleton.isConnecting = false;
function default_1() {
    return RedisSingleton.getInstance();
}
class RedlockSingleton {
    constructor() { }
    static getInstance() {
        if (!RedlockSingleton.instance) {
            const redisClient = RedisSingleton.getInstance();
            RedlockSingleton.instance = new redlock_1.default([redisClient], {
                driftFactor: 0.01,
                retryCount: 10,
                retryDelay: 200,
                retryJitter: 200,
                automaticExtensionThreshold: 500,
            });
            RedlockSingleton.instance.on('error', (error) => {
                console_1.logger.error("REDLOCK", `Error: ${error.message}`);
            });
        }
        return RedlockSingleton.instance;
    }
}
exports.RedlockSingleton = RedlockSingleton;
exports.redisClient = RedisSingleton.getInstance();
exports.redlock = RedlockSingleton.getInstance();
