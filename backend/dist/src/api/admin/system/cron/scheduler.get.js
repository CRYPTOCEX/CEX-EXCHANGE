"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const os_1 = __importDefault(require("os"));
const worker_threads_1 = require("worker_threads");
const mode_1 = require("@b/cron/mode");
const heartbeat_1 = require("@b/cron/heartbeat");
exports.metadata = {
    summary: "Scheduler liveness and process placement",
    operationId: "getCronScheduler",
    tags: ["Admin", "Cron"],
    description: "Reports which process is registering cron jobs, how recently it reported in, " +
        "and whether more than one process is scheduling.",
    responses: {
        200: {
            description: "Scheduler placement resolved",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            status: {
                                type: "string",
                                description: "running | missing | stale | duplicate | unknown — unknown means the heartbeat could not be read, which is NOT the same as no scheduler",
                            },
                            message: { type: "string" },
                            process: {
                                type: "object",
                                properties: {
                                    mode: { type: "string" },
                                    pid: { type: "number" },
                                    hostname: { type: "string" },
                                    registersJobs: { type: "boolean" },
                                    delegated: { type: "boolean" },
                                    canTrigger: { type: "boolean" },
                                    triggersRemotely: { type: "boolean" },
                                },
                            },
                            scheduler: {
                                type: "object",
                                nullable: true,
                                properties: {
                                    instanceId: { type: "string" },
                                    pid: { type: "number" },
                                    hostname: { type: "string" },
                                    mode: { type: "string" },
                                    jobs: { type: "number" },
                                    at: { type: "string" },
                                    ageMs: { type: "number" },
                                    stale: { type: "boolean" },
                                    sameProcess: { type: "boolean" },
                                    peer: { type: "object", nullable: true },
                                },
                            },
                        },
                    },
                },
            },
        },
        401: { description: "Unauthorized" },
    },
    requiresAuth: true,
    permission: "view.cron",
    logModule: "ADMIN_SYSTEM",
    logTitle: "Get Cron Scheduler Placement",
};
const seconds = (ms) => Math.round(ms / 1000);
exports.default = async (data) => {
    var _a;
    const { ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Reading the scheduler heartbeat");
    const mode = (0, mode_1.cronMode)();
    const delegated = (0, mode_1.isCronDelegated)();
    const self = {
        mode,
        pid: process.pid,
        hostname: os_1.default.hostname(),
        registersJobs: (0, mode_1.shouldRegisterCronJobs)(),
        delegated,
        canTrigger: worker_threads_1.isMainThread,
        triggersRemotely: worker_threads_1.isMainThread && delegated,
    };
    let observed = null;
    try {
        observed = await (0, heartbeat_1.readSchedulerHeartbeat)();
    }
    catch (error) {
        ctx === null || ctx === void 0 ? void 0 : ctx.warn("Heartbeat unreadable");
        return {
            status: "unknown",
            message: "Cannot tell whether the scheduler is running: its heartbeat lives in Redis and Redis " +
                `could not be read (${(error === null || error === void 0 ? void 0 : error.message) || "unknown error"}). This is a cache problem, not ` +
                "necessarily a scheduler one — check System Health.",
            process: self,
            scheduler: null,
        };
    }
    if (!observed) {
        ctx === null || ctx === void 0 ? void 0 : ctx.success("No scheduler heartbeat");
        return {
            status: "missing",
            message: delegated
                ? "NO process is registering cron jobs. This backend runs CRON_MODE=off, so the separate " +
                    "`cron` process owns every scheduled job — and it has not reported in for at least 90 " +
                    "seconds. Nothing scheduled is happening: no withdrawals, no price updates, no " +
                    "settlement, no expiries. Start it with `pnpm start`, then check `pm2 logs cron`."
                : "No scheduler heartbeat has been written in the last 90 seconds, even though this " +
                    `process runs CRON_MODE=${mode} and should be writing one. Scheduled work may not be ` +
                    "running — check the process log for a boot failure.",
            process: self,
            scheduler: null,
        };
    }
    const { beat, ageMs } = observed;
    const scheduler = {
        instanceId: beat.instanceId,
        pid: Number(beat.pid),
        hostname: String(beat.hostname),
        mode: beat.mode,
        jobs: Number(beat.jobs) || 0,
        at: new Date(Number(beat.at)).toISOString(),
        ageMs,
        stale: ageMs > heartbeat_1.SCHEDULER_STALE_MS,
        sameProcess: beat.pid === process.pid && beat.hostname === os_1.default.hostname(),
        peer: (_a = beat.peer) !== null && _a !== void 0 ? _a : null,
    };
    if (scheduler.peer && !scheduler.stale) {
        ctx === null || ctx === void 0 ? void 0 : ctx.warn("Two schedulers");
        return {
            status: "duplicate",
            message: `TWO processes are registering cron jobs: ${scheduler.instanceId} and ` +
                `${scheduler.peer.instanceId}. Every scheduled job can run twice over the same rows, ` +
                "withdrawals included. Exactly one process may schedule — run `pnpm start` (it reconciles " +
                "the PM2 scheduler layout) and stop anything started outside it.",
            process: self,
            scheduler,
        };
    }
    if (scheduler.stale) {
        ctx === null || ctx === void 0 ? void 0 : ctx.warn("Scheduler stale");
        return {
            status: "stale",
            message: `The scheduler stopped reporting ${seconds(ageMs)} seconds ago (last seen on ` +
                `${scheduler.instanceId}). Scheduled work is not running. Check \`pm2 logs cron\`.`,
            process: self,
            scheduler,
        };
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Scheduler is beating");
    return {
        status: "running",
        message: scheduler.mode === "only"
            ? `A dedicated cron process is running the scheduler (${scheduler.instanceId}) with ` +
                `${scheduler.jobs} jobs registered.`
            : `The scheduler is running inline in the backend process (${scheduler.instanceId}) with ` +
                `${scheduler.jobs} jobs registered.`,
        process: self,
        scheduler,
    };
};
