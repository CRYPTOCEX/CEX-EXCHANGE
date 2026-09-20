"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.redlock = exports.redisClient = exports.RedlockSingleton = exports.RedisSingleton = void 0;
exports.default = default_1;
const ioredis_1 = require("ioredis");
const redlock_1 = __importDefault(require("redlock"));
const events_1 = require("events");
const console_1 = require("./console");
const BOOT_PROBE_TIMEOUT_MS = 30000;
const OUTAGE_ANNOUNCE_DELAY_MS = 1000;
const OUTAGE_REPEAT_MS = 60000;
const EXIT_MISCONFIGURED = 78;
function isConnectionError(error) {
    const msg = String((error === null || error === void 0 ? void 0 : error.message) || error);
    return (msg.includes("ECONNREFUSED") ||
        msg.includes("ECONNRESET") ||
        msg.includes("ETIMEDOUT") ||
        msg.includes("EHOSTUNREACH") ||
        msg.includes("ENOTFOUND") ||
        msg.includes("EPIPE") ||
        msg.includes("Connection is closed") ||
        msg.includes("Command timed out") ||
        msg.includes("max retries per request"));
}
function redisTarget() {
    const host = process.env.REDIS_HOST || "127.0.0.1";
    const port = process.env.REDIS_PORT || "6379";
    const db = process.env.REDIS_DB || "0";
    return `${host}:${port} (db ${db})`;
}
class RedisConnection {
    constructor() {
        this.events = new events_1.EventEmitter();
        this.ready = false;
        this.everReady = false;
        this.readyWaiters = [];
        this.lastError = "";
        this.announceTimer = null;
        this.outageAnnounced = false;
        this.outageRepeatTimer = null;
        this.closing = false;
        this.client = new ioredis_1.Redis({
            host: process.env.REDIS_HOST || "127.0.0.1",
            port: parseInt(process.env.REDIS_PORT || "6379"),
            password: process.env.REDIS_PASSWORD,
            db: parseInt(process.env.REDIS_DB || "0"),
            enableOfflineQueue: true,
            maxRetriesPerRequest: 3,
            enableReadyCheck: true,
            connectTimeout: 5000,
            commandTimeout: 5000,
            family: 4,
            keepAlive: 30000,
            retryStrategy: (times) => Math.min(500 * Math.pow(2, Math.min(times, 6)), 30000),
        });
        this.client.on("ready", () => this.markUp());
        this.client.on("error", (error) => {
            this.lastError = String((error === null || error === void 0 ? void 0 : error.message) || error);
        });
        this.client.on("end", () => this.markDown("connection ended"));
        this.client.on("close", () => this.markDown("connection closed"));
    }
    isUp() {
        return this.ready;
    }
    hasEverConnected() {
        return this.everReady;
    }
    lastErrorMessage() {
        return this.lastError;
    }
    waitUntilReady(timeoutMs) {
        if (this.ready)
            return Promise.resolve(true);
        return new Promise((resolve) => {
            let settled = false;
            const done = (ok) => {
                if (settled)
                    return;
                settled = true;
                clearTimeout(timer);
                resolve(ok);
            };
            const timer = setTimeout(() => done(this.ready), timeoutMs);
            timer.unref();
            this.readyWaiters.push(done);
        });
    }
    markUp() {
        const wasDown = !this.ready;
        this.ready = true;
        this.clearAnnounceTimers();
        if (this.outageAnnounced) {
            console_1.logger.warn("REDIS", `Redis reconnected at ${redisTarget()}`);
        }
        else if (!this.everReady) {
            console_1.logger.info("REDIS", `Redis connected at ${redisTarget()}`);
        }
        this.outageAnnounced = false;
        this.everReady = true;
        const waiters = this.readyWaiters;
        this.readyWaiters = [];
        for (const waiter of waiters)
            waiter(true);
        if (wasDown)
            this.events.emit("availability", true);
    }
    markDown(reason) {
        if (!this.ready)
            return;
        this.ready = false;
        if (!this.announceTimer && !this.closing) {
            this.announceTimer = setTimeout(() => {
                this.announceTimer = null;
                if (this.ready)
                    return;
                this.outageAnnounced = true;
                this.logOutage(reason);
                this.outageRepeatTimer = setInterval(() => {
                    if (this.ready)
                        return;
                    this.logOutage(reason);
                }, OUTAGE_REPEAT_MS);
                this.outageRepeatTimer.unref();
            }, OUTAGE_ANNOUNCE_DELAY_MS);
            this.announceTimer.unref();
        }
        this.events.emit("availability", false);
    }
    logOutage(reason) {
        console_1.logger.error("REDIS", `Redis is UNREACHABLE at ${redisTarget()} (${reason}${this.lastError ? `: ${this.lastError}` : ""}). Reconnecting with backoff. Until it returns: queued jobs do not run, ` +
            `cross-process cache invalidation is not delivered, and anything that needs ` +
            `Redis fails with an error rather than serving a stale answer.`);
    }
    clearAnnounceTimers() {
        if (this.announceTimer) {
            clearTimeout(this.announceTimer);
            this.announceTimer = null;
        }
        if (this.outageRepeatTimer) {
            clearInterval(this.outageRepeatTimer);
            this.outageRepeatTimer = null;
        }
    }
    dispose() {
        this.closing = true;
        this.clearAnnounceTimers();
        const waiters = this.readyWaiters;
        this.readyWaiters = [];
        for (const waiter of waiters)
            waiter(false);
    }
}
function reportMissingRedis(reason) {
    const host = process.env.REDIS_HOST || "127.0.0.1";
    const port = process.env.REDIS_PORT || "6379";
    const hostSource = process.env.REDIS_HOST ? "REDIS_HOST" : "REDIS_HOST unset, default";
    const portSource = process.env.REDIS_PORT ? "REDIS_PORT" : "REDIS_PORT unset, default";
    const authNote = process.env.REDIS_PASSWORD
        ? "REDIS_PASSWORD is set — an auth failure looks identical to a refused connection here."
        : "REDIS_PASSWORD is empty — if your Redis requires a password, set it in .env.";
    const rule = "═".repeat(74);
    process.stderr.write(`\n${rule}\n` +
        ` REDIS IS UNREACHABLE — the backend cannot start\n` +
        `${rule}\n` +
        ` Tried:     ${host}:${port}   (db ${process.env.REDIS_DB || "0"})\n` +
        `            host from ${hostSource}, port from ${portSource}\n` +
        ` Result:    ${reason}\n` +
        `\n` +
        ` Redis is a REQUIRED dependency of this platform. It is not a cache we can\n` +
        ` do without: sessions, rate limits, distributed locks, the cron scheduler\n` +
        ` (BullMQ) and cross-process settings invalidation all live in it. Running\n` +
        ` without it used to silently fall back to a per-process in-memory store,\n` +
        ` which cannot coordinate anything — two processes would each believe they\n` +
        ` held the same lock, and settings changes would never reach the others.\n` +
        ` That fallback has been removed, so this is now a hard requirement.\n` +
        `\n` +
        ` Fix on this server:\n` +
        `   1. Install and start Redis:\n` +
        `        Ubuntu/Debian:  sudo apt-get install -y redis-server\n` +
        `                        sudo systemctl enable --now redis-server\n` +
        `        RHEL/CentOS:    sudo dnf install -y redis && sudo systemctl enable --now redis\n` +
        `        Docker:         docker run -d --name redis -p 6379:6379 --restart always redis:7\n` +
        `        macOS:          brew install redis && brew services start redis\n` +
        `        Windows:        run Redis inside WSL2 or Docker Desktop\n` +
        `\n` +
        `   2. Verify it answers from THIS machine:\n` +
        `        redis-cli -h ${host} -p ${port} ping      # expects: PONG\n` +
        `\n` +
        `   3. Point the backend at it in .env (repo root), then start again:\n` +
        `        REDIS_HOST="${host}"\n` +
        `        REDIS_PORT="${port}"\n` +
        `        REDIS_PASSWORD=""\n` +
        `      ${authNote}\n` +
        `\n` +
        ` Exiting with code ${EXIT_MISCONFIGURED} (EX_CONFIG) so PM2 stops the app instead of\n` +
        ` restart-looping this message out of the screen.\n` +
        `${rule}\n\n`);
}
class RedisSingleton {
    constructor() { }
    static ensureConnection() {
        if (!RedisSingleton.connection) {
            RedisSingleton.connection = new RedisConnection();
        }
        return RedisSingleton.connection;
    }
    static getInstance() {
        return RedisSingleton.ensureConnection().client;
    }
    static async assertRedisAvailable() {
        const connection = RedisSingleton.ensureConnection();
        if (connection.isUp())
            return;
        console_1.logger.warn("REDIS", `Waiting up to ${Math.round(BOOT_PROBE_TIMEOUT_MS / 1000)}s for Redis at ${redisTarget()}...`);
        if (await connection.waitUntilReady(BOOT_PROBE_TIMEOUT_MS))
            return;
        reportMissingRedis(connection.lastErrorMessage() ||
            `no connection within ${Math.round(BOOT_PROBE_TIMEOUT_MS / 1000)}s`);
        process.exit(EXIT_MISCONFIGURED);
    }
    static isRedisUp() {
        return RedisSingleton.ensureConnection().isUp();
    }
    static async waitForProbe() {
        const connection = RedisSingleton.ensureConnection();
        if (!connection.hasEverConnected()) {
            await connection.waitUntilReady(BOOT_PROBE_TIMEOUT_MS);
        }
        return connection.isUp();
    }
    static onAvailabilityChange(cb) {
        RedisSingleton.ensureConnection().events.on("availability", cb);
    }
    static async safeGet(key, timeoutMs = 3000) {
        const redis = this.getInstance();
        return Promise.race([
            redis.get(key),
            new Promise((_, reject) => setTimeout(() => reject(new Error("Redis GET timeout")), timeoutMs)),
        ]).catch((error) => {
            console_1.logger.error("REDIS", `GET error for key ${key}: ${error}`);
            return null;
        });
    }
    static async safeSet(key, value, timeoutMs = 3000) {
        const redis = this.getInstance();
        return Promise.race([
            redis.set(key, value).then(() => true),
            new Promise((_, reject) => setTimeout(() => reject(new Error("Redis SET timeout")), timeoutMs)),
        ]).catch((error) => {
            console_1.logger.error("REDIS", `SET error for key ${key}: ${error}`);
            return false;
        });
    }
    static async cleanup() {
        if (RedisSingleton.connection) {
            const connection = RedisSingleton.connection;
            connection.dispose();
            try {
                await connection.client.quit();
            }
            catch (error) {
                console_1.logger.error("REDIS", `Error during cleanup: ${error}`);
            }
            RedisSingleton.connection = null;
        }
    }
}
exports.RedisSingleton = RedisSingleton;
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
            RedlockSingleton.instance.on("error", (error) => {
                if (!isConnectionError(error)) {
                    console_1.logger.error("REDLOCK", `Error: ${error.message}`);
                }
            });
        }
        return RedlockSingleton.instance;
    }
}
exports.RedlockSingleton = RedlockSingleton;
exports.redisClient = RedisSingleton.getInstance();
exports.redlock = RedlockSingleton.getInstance();
