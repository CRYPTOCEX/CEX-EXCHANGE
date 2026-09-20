"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SCHEDULER_STALE_MS = exports.SCHEDULER_HEARTBEAT_KEY = void 0;
exports.isLivePeer = isLivePeer;
exports.startSchedulerHeartbeat = startSchedulerHeartbeat;
exports.readSchedulerHeartbeat = readSchedulerHeartbeat;
const os_1 = __importDefault(require("os"));
const console_1 = require("@b/utils/console");
const redis_1 = require("@b/utils/redis");
const mode_1 = require("./mode");
exports.SCHEDULER_HEARTBEAT_KEY = "cron:scheduler";
const BEAT_INTERVAL_MS = 15000;
const BEAT_TTL_SECONDS = 90;
exports.SCHEDULER_STALE_MS = 60000;
const INSTANCE_ID = `${os_1.default.hostname()}:${process.pid}`;
let timer = null;
let peerAnnounced = false;
function isPidAlive(pid) {
    try {
        process.kill(pid, 0);
        return true;
    }
    catch (error) {
        return (error === null || error === void 0 ? void 0 : error.code) === "EPERM";
    }
}
function isLivePeer(previous, ageMs) {
    if (!Number.isFinite(ageMs) || ageMs >= exports.SCHEDULER_STALE_MS)
        return false;
    const samePid = Number(previous.pid);
    if (String(previous.hostname) === os_1.default.hostname() && Number.isInteger(samePid)) {
        return isPidAlive(samePid);
    }
    return true;
}
async function beat(jobs) {
    const redis = redis_1.RedisSingleton.getInstance();
    const now = Date.now();
    let peer = null;
    try {
        const raw = await redis.get(exports.SCHEDULER_HEARTBEAT_KEY);
        if (raw) {
            const previous = JSON.parse(raw);
            const age = now - Number(previous === null || previous === void 0 ? void 0 : previous.at);
            if ((previous === null || previous === void 0 ? void 0 : previous.instanceId) &&
                previous.instanceId !== INSTANCE_ID &&
                isLivePeer(previous, age)) {
                peer = {
                    instanceId: previous.instanceId,
                    pid: Number(previous.pid),
                    hostname: String(previous.hostname),
                    at: Number(previous.at),
                };
                if (!peerAnnounced) {
                    peerAnnounced = true;
                    console_1.logger.error("CRON", `A SECOND process is registering cron jobs against this database: ${peer.instanceId} ` +
                        `(this process is ${INSTANCE_ID}). BullMQ gives a repeatable job to whichever worker ` +
                        `takes it and the single-flight guard is per-process, so every scheduled job — ` +
                        `withdrawals included — can run twice over the same rows. Exactly one process may ` +
                        `register jobs: run \`pnpm start\` (which reconciles the PM2 scheduler layout) and ` +
                        `stop anything started outside it.`);
                }
            }
        }
    }
    catch (_a) {
    }
    const value = {
        at: now,
        instanceId: INSTANCE_ID,
        pid: process.pid,
        hostname: os_1.default.hostname(),
        mode: (0, mode_1.cronMode)(),
        jobs,
        peer,
    };
    try {
        await redis.set(exports.SCHEDULER_HEARTBEAT_KEY, JSON.stringify(value), "EX", BEAT_TTL_SECONDS);
    }
    catch (_b) {
    }
}
function startSchedulerHeartbeat(jobs) {
    if (timer)
        return;
    void beat(jobs);
    timer = setInterval(() => void beat(jobs), BEAT_INTERVAL_MS);
    timer.unref();
}
async function readSchedulerHeartbeat() {
    const raw = await redis_1.RedisSingleton.getInstance().get(exports.SCHEDULER_HEARTBEAT_KEY);
    if (!raw)
        return null;
    try {
        const parsed = JSON.parse(raw);
        if (!parsed || !Number.isFinite(Number(parsed.at)))
            return null;
        return { beat: parsed, ageMs: Date.now() - Number(parsed.at) };
    }
    catch (_a) {
        return null;
    }
}
