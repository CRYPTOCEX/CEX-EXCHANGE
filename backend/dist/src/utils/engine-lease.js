"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EngineLease = exports.ENGINE_LEASE_KEYS = void 0;
exports.isEngineLeaseCandidate = isEngineLeaseCandidate;
exports.isEcosystemDoor = isEcosystemDoor;
exports.isEngineLeaseFollower = isEngineLeaseFollower;
exports.noteEngineRunsElsewhere = noteEngineRunsElsewhere;
exports.clearEngineElsewhereNotice = clearEngineElsewhereNotice;
exports.getEngineLease = getEngineLease;
exports.engineLeaseReports = engineLeaseReports;
const os_1 = __importDefault(require("os"));
const crypto_1 = require("crypto");
const sequelize_1 = require("sequelize");
const db_1 = require("@b/db");
const redis_1 = require("./redis");
const settings_bus_1 = require("./settings-bus");
const console_1 = require("./console");
const mode_1 = require("@b/cron/mode");
const process_role_1 = require("./process-role");
const rust_owns_1 = require("./rust-owns");
const redis = redis_1.RedisSingleton.getInstance();
const PROCESS_TAG = `${os_1.default.hostname()}:${process.pid}`;
exports.ENGINE_LEASE_KEYS = {
    ECOSYSTEM_MATCHING: "ecosystem-matching",
    FUTURES_MATCHING: "futures-matching",
    FOREX_TRADING: "forex-trading",
    AI_MARKET_MAKER: "ai-market-maker",
    DEX_CONFIRMATIONS: "dex-confirmations",
    DEX_POOL_INDEX: "dex-pool-index",
};
const LEASE_TTL_SECONDS = 20;
function isPidAlive(pid) {
    try {
        process.kill(pid, 0);
        return true;
    }
    catch (error) {
        return (error === null || error === void 0 ? void 0 : error.code) === "EPERM";
    }
}
function hasProvenSiblingProcess() {
    const pm2Instance = Number(process.env.NODE_APP_INSTANCE);
    return Number.isFinite(pm2Instance) && pm2Instance > 0;
}
function isEngineLeaseCandidate(key) {
    if ((0, rust_owns_1.rustOwns)(`lease.${key}`))
        return false;
    if (key === exports.ENGINE_LEASE_KEYS.ECOSYSTEM_MATCHING && isEcosystemDoor() && !shardTierOwnsASubset())
        return false;
    if (key === exports.ENGINE_LEASE_KEYS.AI_MARKET_MAKER) {
        return roleIsLeaseCandidate();
    }
    return roleIsLeaseCandidate();
}
function isEcosystemDoor() {
    var _a;
    return ["1", "true", "on", "yes"].includes(String((_a = process.env.ECO_DOOR) !== null && _a !== void 0 ? _a : "").trim().toLowerCase());
}
function shardTierOwnsASubset() {
    var _a, _b;
    if (String((_a = process.env.ECO_SHARD_SHADOW_SYMBOLS) !== null && _a !== void 0 ? _a : "").trim() !== "")
        return true;
    const raw = String((_b = process.env.ECO_SHARD_SYMBOLS) !== null && _b !== void 0 ? _b : "").trim();
    if (raw !== "") {
        if (raw.toLowerCase() === "none")
            return true;
        return raw.split(/[\s,]+/).some((part) => part.trim() !== "");
    }
    try {
        const router = require("@b/api/(ext)/ecosystem/utils/scale/router");
        if (typeof (router === null || router === void 0 ? void 0 : router.loadShardMap) !== "function")
            return false;
        const map = router.loadShardMap(process.env, () => undefined);
        return (map === null || map === void 0 ? void 0 : map.symbols) !== null && (map === null || map === void 0 ? void 0 : map.symbols) !== undefined;
    }
    catch (_c) {
        return false;
    }
}
function roleIsLeaseCandidate() {
    const role = (0, process_role_1.processRole)();
    if (role === "trading" || role === "inline")
        return true;
    if (role === "cron")
        return false;
    return (0, process_role_1.declaredProcessRole)() !== "web";
}
function isEngineLeaseFollower(key) {
    const lease = leases.get(key);
    if (!lease)
        return false;
    return lease.isClaimSettled() && !lease.isHeld();
}
const announcedElsewhere = new Set();
function noteEngineRunsElsewhere(subsystem, message, level = "info") {
    const once = `${subsystem} ${message}`;
    if (announcedElsewhere.has(once))
        return;
    announcedElsewhere.add(once);
    if ((0, mode_1.isCronOnlyProcess)())
        console_1.logger.debug(subsystem, message);
    else if (level === "warn")
        console_1.logger.warn(subsystem, message);
    else
        console_1.logger.info(subsystem, message);
}
function clearEngineElsewhereNotice(subsystem) {
    for (const key of announcedElsewhere) {
        if (key.startsWith(`${subsystem} `))
            announcedElsewhere.delete(key);
    }
}
class EngineLease {
    constructor(options) {
        this.instanceId = (0, crypto_1.randomUUID)();
        this.held = false;
        this.arbiter = "none";
        this.blockedBy = null;
        this.renewal = null;
        this.promotion = null;
        this.acquiring = null;
        this.claimSettled = false;
        this.options = options;
        this.redisKey = `engine:lease:${options.key}`;
    }
    acquire() {
        if (this.held)
            return Promise.resolve(true);
        if (this.acquiring)
            return this.acquiring;
        this.acquiring = this.claim()
            .then((won) => {
            if (!won)
                this.startPromotionPolling();
            return won;
        })
            .finally(() => {
            this.acquiring = null;
            this.claimSettled = true;
        });
        return this.acquiring;
    }
    startPromotionPolling() {
        var _a, _b;
        if (this.promotion || this.held)
            return;
        if (this.blockedBy === "policy")
            return;
        this.promotion = setInterval(() => {
            if (this.held || this.acquiring)
                return;
            void this.pollForPromotion();
        }, LEASE_TTL_SECONDS * 1000);
        (_b = (_a = this.promotion).unref) === null || _b === void 0 ? void 0 : _b.call(_a);
    }
    async pollForPromotion() {
        var _a, _b;
        let won = false;
        try {
            won = await this.claim();
        }
        catch (_c) {
            return;
        }
        if (!won)
            return;
        if (this.promotion) {
            clearInterval(this.promotion);
            this.promotion = null;
        }
        console_1.logger.info(this.options.subsystem, `Promoted to leader of the ${this.options.label}: the previous holder's lease lapsed and ` +
            `this process claimed it. Writes are enabled here now.`);
        try {
            await ((_b = (_a = this.options).onPromote) === null || _b === void 0 ? void 0 : _b.call(_a));
        }
        catch (error) {
            console_1.logger.error(this.options.subsystem, `The ${this.options.label} promotion handler threw; standing back down so another ` +
                `process can take the lease`, error);
            await this.standDown("the promotion handler threw", true);
            this.startPromotionPolling();
        }
    }
    async claim() {
        if (!isEngineLeaseCandidate(this.options.key)) {
            this.arbiter = "none";
            this.blockedBy = "policy";
            return false;
        }
        const dbClaim = await this.claimDbLease();
        if (dbClaim === false) {
            this.blockedBy = "database lease row";
            console_1.logger.warn(this.options.subsystem, `Another process holds the ${this.options.label} lease in the database ` +
                `(engine_lease.${this.options.key}); this process will run read-only`);
            return false;
        }
        let arbiter;
        if (dbClaim === true) {
            arbiter = "database";
            try {
                await redis.set(this.redisKey, PROCESS_TAG, "EX", LEASE_TTL_SECONDS);
            }
            catch (_a) {
            }
        }
        else {
            let redisAnswered = false;
            try {
                const claimed = await redis.set(this.redisKey, PROCESS_TAG, "EX", LEASE_TTL_SECONDS, "NX");
                if (claimed === null) {
                    const holder = await redis.get(this.redisKey);
                    if (holder !== PROCESS_TAG) {
                        this.blockedBy = holder !== null && holder !== void 0 ? holder : "unknown";
                        console_1.logger.warn(this.options.subsystem, `Another process (${this.blockedBy}) holds the ${this.options.label} lease; ` +
                            `this process will run read-only`);
                        return false;
                    }
                    await redis.expire(this.redisKey, LEASE_TTL_SECONDS);
                }
                redisAnswered = true;
            }
            catch (error) {
                console_1.logger.debug(this.options.subsystem, `Redis leadership check unavailable for ${this.options.label}`, error);
            }
            arbiter = redisAnswered ? "redis" : "none";
        }
        if (arbiter === "none" && hasProvenSiblingProcess()) {
            this.arbiter = "none";
            this.blockedBy = "unarbitrated";
            console_1.logger.error(this.options.subsystem, `Refusing the ${this.options.label} lease: this is pm2 instance ` +
                `${process.env.NODE_APP_INSTANCE} (so a sibling process exists) and NEITHER Redis nor ` +
                `the database could say who leads. Running unarbitrated here would mean two engines ` +
                `over the same orders. ${this.options.unarbitratedConsequence}`);
            return false;
        }
        this.arbiter = arbiter;
        this.blockedBy = null;
        if (arbiter === "none") {
            (0, settings_bus_1.warnUnarbitratedMultiProcess)(this.options.subsystem, `NOTHING is arbitrating ${this.options.label} leadership right now — neither Redis nor ` +
                `the database lease row could be reached. ${this.options.unarbitratedConsequence}`);
        }
        this.held = true;
        this.startRenewal();
        installExitHook();
        activeLeases.add(this);
        return true;
    }
    async claimDbLease() {
        try {
            const now = new Date();
            const claim = {
                instanceId: this.instanceId,
                hostname: os_1.default.hostname(),
                pid: process.pid,
                expiresAt: new Date(now.getTime() + LEASE_TTL_SECONDS * 1000),
            };
            const [taken] = await db_1.models.engineLease.update(claim, {
                where: {
                    id: this.options.key,
                    [sequelize_1.Op.or]: [
                        { instanceId: this.instanceId },
                        { expiresAt: { [sequelize_1.Op.lte]: now } },
                        { hostname: os_1.default.hostname(), pid: process.pid },
                    ],
                },
            });
            if (taken > 0)
                return true;
            const row = await db_1.models.engineLease.findByPk(this.options.key);
            if (!row) {
                try {
                    await db_1.models.engineLease.create({ id: this.options.key, ...claim });
                    return true;
                }
                catch (error) {
                    if (String((error === null || error === void 0 ? void 0 : error.name) || "").includes("Unique"))
                        return false;
                    throw error;
                }
            }
            if (row.instanceId === this.instanceId)
                return true;
            if (row.hostname === os_1.default.hostname() && Number(row.pid) === process.pid)
                return true;
            if (row.hostname === os_1.default.hostname() && row.pid != null && !isPidAlive(Number(row.pid))) {
                const [reclaimed] = await db_1.models.engineLease.update(claim, {
                    where: { id: this.options.key, instanceId: row.instanceId },
                });
                if (reclaimed > 0) {
                    console_1.logger.debug(this.options.subsystem, `Reclaimed the ${this.options.label} lease from a dead process ` +
                        `(pid ${row.pid} on ${row.hostname})`);
                    return true;
                }
            }
            return false;
        }
        catch (error) {
            console_1.logger.debug(this.options.subsystem, `Database leadership arbiter unavailable for ${this.options.label}`, error);
            return null;
        }
    }
    async releaseDbLease() {
        try {
            await db_1.models.engineLease.update({ expiresAt: new Date(0) }, { where: { id: this.options.key, instanceId: this.instanceId } });
        }
        catch (error) {
            console_1.logger.debug(this.options.subsystem, `Failed to release the ${this.options.label} database lease`, error);
        }
    }
    startRenewal() {
        var _a, _b;
        if (this.renewal)
            return;
        this.renewal = setInterval(() => {
            void this.renew();
        }, (LEASE_TTL_SECONDS / 3) * 1000);
        (_b = (_a = this.renewal).unref) === null || _b === void 0 ? void 0 : _b.call(_a);
    }
    async renew() {
        if (!this.held)
            return;
        const dbClaim = await this.claimDbLease();
        if (dbClaim === false) {
            await this.standDown("lost the database lease row", false);
            return;
        }
        try {
            const holder = await redis.get(this.redisKey);
            if (holder && holder !== PROCESS_TAG) {
                await this.standDown(`lost the Redis lock to ${holder}`, true);
                return;
            }
            await redis.set(this.redisKey, PROCESS_TAG, "EX", LEASE_TTL_SECONDS);
        }
        catch (_a) {
        }
    }
    async standDown(reason, handBackRow) {
        var _a, _b;
        if (!this.held)
            return;
        this.held = false;
        this.arbiter = "none";
        activeLeases.delete(this);
        if (this.renewal) {
            clearInterval(this.renewal);
            this.renewal = null;
        }
        console_1.logger.error(this.options.subsystem, `Stood down from the ${this.options.label}: ${reason}. This process is now read-only ` +
            `for that engine until it restarts.`);
        if (handBackRow) {
            await this.releaseDbLease();
        }
        try {
            await ((_b = (_a = this.options).onStandDown) === null || _b === void 0 ? void 0 : _b.call(_a));
        }
        catch (error) {
            console_1.logger.error(this.options.subsystem, `The ${this.options.label} stand-down handler threw`, error);
        }
    }
    async release() {
        if (this.renewal) {
            clearInterval(this.renewal);
            this.renewal = null;
        }
        if (!this.held)
            return;
        this.held = false;
        this.arbiter = "none";
        activeLeases.delete(this);
        try {
            const holder = await redis.get(this.redisKey);
            if (holder === PROCESS_TAG)
                await redis.del(this.redisKey);
        }
        catch (_a) {
        }
        await this.releaseDbLease();
    }
    getInstanceId() {
        return this.instanceId;
    }
    isHeld() {
        return this.held;
    }
    isClaimSettled() {
        return this.claimSettled;
    }
    arbitratedBy() {
        return this.arbiter;
    }
    report() {
        return {
            key: this.options.key,
            held: this.held,
            candidate: isEngineLeaseCandidate(this.options.key),
            arbitratedBy: this.arbiter,
            instanceId: this.instanceId,
            blockedBy: this.blockedBy,
        };
    }
}
exports.EngineLease = EngineLease;
const leases = new Map();
const activeLeases = new Set();
let exitHookInstalled = false;
function installExitHook() {
    if (exitHookInstalled)
        return;
    exitHookInstalled = true;
    const release = () => {
        for (const lease of [...activeLeases])
            void lease.release();
    };
    for (const signal of ["SIGINT", "SIGTERM", "SIGHUP", "beforeExit"]) {
        process.once(signal, release);
    }
}
function getEngineLease(options) {
    const existing = leases.get(options.key);
    if (existing)
        return existing;
    const lease = new EngineLease(options);
    leases.set(options.key, lease);
    return lease;
}
function engineLeaseReports() {
    return [...leases.values()].map((lease) => lease.report());
}
