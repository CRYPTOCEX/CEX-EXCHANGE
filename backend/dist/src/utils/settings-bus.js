"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BUS_DEGRADED_TTL_MS = void 0;
exports.subscribe = subscribe;
exports.publish = publish;
exports.isBusActive = isBusActive;
exports.busTtl = busTtl;
exports.isMultiProcessDeployment = isMultiProcessDeployment;
exports.warnUnarbitratedMultiProcess = warnUnarbitratedMultiProcess;
const worker_threads_1 = require("worker_threads");
const console_1 = require("./console");
const redis_1 = require("./redis");
exports.BUS_DEGRADED_TTL_MS = 5000;
const redis = redis_1.RedisSingleton.getInstance();
const PROCESS_ID = `${process.pid}.${worker_threads_1.threadId}.${Date.now().toString(36)}.${Math.random()
    .toString(36)
    .slice(2, 8)}`;
const handlers = new Map();
let subscriber = null;
let subscriberUnavailable = false;
let busActive = false;
let degradedAnnounced = false;
const loudWarned = new Set();
function announceDegraded(reason) {
    if (degradedAnnounced)
        return;
    degradedAnnounced = true;
    console_1.logger.warn("SETTINGS_BUS", `${reason} — settings changes cannot be announced to other processes. Caches on this bus ` +
        `fall back to a ${Math.round(exports.BUS_DEGRADED_TTL_MS / 1000)}s refresh, so a change made elsewhere ` +
        `converges within seconds instead of instantly. This clears when Redis reconnects.`);
}
async function syncSubscriptions() {
    if (!subscriber)
        return;
    const channels = [...handlers.keys()];
    if (channels.length === 0)
        return;
    try {
        await subscriber.subscribe(...channels);
        busActive = true;
    }
    catch (_a) {
        busActive = false;
    }
}
function handleMessage(channel, raw) {
    var _a;
    const listeners = handlers.get(channel);
    if (!listeners || listeners.size === 0)
        return;
    let payload;
    try {
        payload = JSON.parse(raw);
    }
    catch (_b) {
        payload = { raw };
    }
    if (payload && payload.__src === PROCESS_ID)
        return;
    for (const handler of listeners) {
        try {
            handler(payload);
        }
        catch (error) {
            console_1.logger.error("SETTINGS_BUS", `Handler for "${channel}" threw: ${(_a = error === null || error === void 0 ? void 0 : error.message) !== null && _a !== void 0 ? _a : error}`, error);
        }
    }
}
function ensureSubscriber() {
    var _a, _b;
    if (subscriber || subscriberUnavailable)
        return;
    let duplicated = null;
    try {
        duplicated = (_b = (_a = redis).duplicate) === null || _b === void 0 ? void 0 : _b.call(_a);
    }
    catch (_c) {
        duplicated = null;
    }
    if (!duplicated || typeof duplicated.subscribe !== "function" || typeof duplicated.on !== "function") {
        subscriberUnavailable = true;
        announceDegraded("The Redis client cannot open a second connection for pub/sub");
        return;
    }
    subscriber = duplicated;
    subscriber.on("error", () => { });
    subscriber.on("message", handleMessage);
    subscriber.on("ready", () => {
        degradedAnnounced = false;
        void syncSubscriptions();
    });
    subscriber.on("end", () => {
        busActive = false;
    });
    subscriber.on("close", () => {
        busActive = false;
    });
}
function subscribe(channel, handler) {
    let listeners = handlers.get(channel);
    if (!listeners) {
        listeners = new Set();
        handlers.set(channel, listeners);
    }
    listeners.add(handler);
    ensureSubscriber();
    void syncSubscriptions();
}
async function publish(channel, payload = {}) {
    var _a;
    const message = JSON.stringify({ ...payload, __src: PROCESS_ID, __at: Date.now() });
    try {
        await redis.publish(channel, message);
        busActive = true;
    }
    catch (error) {
        busActive = false;
        announceDegraded(`Redis pub/sub is unavailable (${(_a = error === null || error === void 0 ? void 0 : error.message) !== null && _a !== void 0 ? _a : error})`);
    }
}
function isBusActive() {
    return busActive;
}
function busTtl(configuredTtlMs) {
    return busActive ? configuredTtlMs : Math.min(configuredTtlMs, exports.BUS_DEGRADED_TTL_MS);
}
function isMultiProcessDeployment() {
    if (!worker_threads_1.isMainThread)
        return true;
    if (process.env.MASH_BACKEND_MULTI_PROCESS === "1")
        return true;
    const pm2Instance = Number(process.env.NODE_APP_INSTANCE);
    if (Number.isFinite(pm2Instance) && pm2Instance > 0)
        return true;
    return false;
}
function warnUnarbitratedMultiProcess(subsystem, consequence) {
    const key = `${subsystem}|${consequence}`;
    if (loudWarned.has(key))
        return;
    if (!isMultiProcessDeployment())
        return;
    loudWarned.add(key);
    const rule = "=".repeat(78);
    console_1.logger.error(subsystem, rule);
    console_1.logger.error(subsystem, "MULTI-PROCESS BACKEND WITH NO WORKING ARBITER — COORDINATION IS DEGRADED");
    console_1.logger.error(subsystem, consequence);
    console_1.logger.error(subsystem, "Neither Redis nor the database answered, so every process that starts this subsystem " +
        "believes it leads. Both are required for cross-process arbitration; restore them, or " +
        "run a single process until they are back.");
    console_1.logger.error(subsystem, rule);
}
