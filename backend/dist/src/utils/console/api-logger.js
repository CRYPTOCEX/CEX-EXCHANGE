"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getApiContext = getApiContext;
exports.logStep = logStep;
exports.logSuccess = logSuccess;
exports.logFail = logFail;
exports.logWarn = logWarn;
exports.logDebug = logDebug;
exports.withLogger = withLogger;
exports.logged = logged;
exports.withSubOperation = withSubOperation;
const async_hooks_1 = require("async_hooks");
const logger_1 = require("./logger");
const loop_lag_1 = require("./loop-lag");
const asyncLocalStorage = new async_hooks_1.AsyncLocalStorage();
(0, loop_lag_1.startLoopLagMonitor)();
function getApiContext() {
    return asyncLocalStorage.getStore();
}
function logStep(message, status) {
    const ctx = getApiContext();
    if (ctx) {
        ctx.step(message, status);
    }
}
function logSuccess(message) {
    const ctx = getApiContext();
    if (ctx) {
        ctx.success(message);
    }
}
function logFail(message) {
    const ctx = getApiContext();
    if (ctx) {
        ctx.fail(message);
    }
}
function logWarn(message) {
    const ctx = getApiContext();
    if (ctx) {
        ctx.warn(message);
    }
}
function logDebug(message) {
    const ctx = getApiContext();
    if (ctx) {
        ctx.debug(message);
    }
}
let requestCounter = 0;
function generateRequestId() {
    requestCounter = (requestCounter + 1) % 1000000;
    return `${Date.now().toString(36)}-${requestCounter.toString(36)}`;
}
function createApiContext(module, title, userId, options) {
    const requestId = generateRequestId();
    const steps = [];
    let status = "running";
    const startTime = Date.now();
    const liveHandle = logger_1.logger.live(module, title);
    if ((options === null || options === void 0 ? void 0 : options.method) && (options === null || options === void 0 ? void 0 : options.url)) {
        liveHandle.setRequest(options.method, options.url);
    }
    const ctx = {
        module,
        title,
        requestId,
        userId,
        _steps: steps,
        _status: status,
        _startTime: startTime,
        _request: options,
        _liveHandle: liveHandle,
        step(message, stepStatus = "info") {
            steps.push({ message, status: stepStatus, time: Date.now() });
            liveHandle.step(message, stepStatus);
        },
        success(message) {
            if (message) {
                steps.push({ message, status: "success", time: Date.now() });
                liveHandle.step(message, "success");
            }
            status = "success";
            this._status = status;
        },
        fail(message) {
            steps.push({ message, status: "error", time: Date.now() });
            liveHandle.step(message, "error");
            status = "error";
            this._status = status;
        },
        warn(message) {
            steps.push({ message, status: "warn", time: Date.now() });
            liveHandle.step(message, "warn");
        },
        debug(message) {
            if (process.env.LOG_LEVEL === "debug") {
                steps.push({ message, status: "info", time: Date.now() });
                liveHandle.step(message, "info");
            }
        },
    };
    return ctx;
}
function slowRequestThresholdMs() {
    const raw = Number(process.env.SLOW_REQUEST_MS);
    if (Number.isFinite(raw) && raw >= 0)
        return raw;
    return 3000;
}
function describeProcessPressure(startedAt, endedAt) {
    var _a, _b, _c, _d, _e, _f, _g;
    var _h, _j, _k, _l;
    const parts = [];
    const stalled = (0, loop_lag_1.stalledMsWithin)(startedAt, endedAt);
    if (stalled > 0)
        parts.push(`event loop stalled ${stalled}ms of this request`);
    try {
        const pool = (_c = (_b = (_a = require("@b/db")) === null || _a === void 0 ? void 0 : _a.sequelize) === null || _b === void 0 ? void 0 : _b.connectionManager) === null || _c === void 0 ? void 0 : _c.pool;
        if (pool && typeof pool.size === "number") {
            const using = Number((_h = pool.using) !== null && _h !== void 0 ? _h : pool.size - pool.available) || 0;
            const max = Number((_l = (_k = (_j = pool.maxSize) !== null && _j !== void 0 ? _j : pool.max) !== null && _k !== void 0 ? _k : (_d = pool._config) === null || _d === void 0 ? void 0 : _d.max) !== null && _l !== void 0 ? _l : (_e = pool.options) === null || _e === void 0 ? void 0 : _e.max) || Number(process.env.DB_POOL_MAX) || 25;
            parts.push(`db pool ${using}/${pool.size} in use of max ${max}, ${Number(pool.waiting) || 0} waiting`);
        }
    }
    catch (_m) {
    }
    try {
        const stats = (_g = (_f = require("@b/services/wallet/serial")) === null || _f === void 0 ? void 0 : _f.walletSerialStats) === null || _g === void 0 ? void 0 : _g.call(_f);
        if (stats && (stats.active > 0 || stats.queuedForKey > 0 || stats.queuedForSlot > 0)) {
            parts.push(`wallet queue ${stats.active} active (cap ${stats.limit}), ${stats.queuedForKey + stats.queuedForSlot} queued`);
        }
    }
    catch (_o) {
    }
    return parts.length ? ` | ${parts.join(" | ")}` : "";
}
function reportSlowOperation(ctx) {
    var _a;
    var _b;
    const threshold = slowRequestThresholdMs();
    if (threshold <= 0)
        return;
    const end = Date.now();
    const duration = end - ctx._startTime;
    if (duration < threshold)
        return;
    const steps = ctx._steps;
    const spans = [];
    if (steps.length > 0) {
        spans.push({
            message: "before the first step (gates, auth, body)",
            ms: steps[0].time - ctx._startTime,
        });
    }
    for (let i = 0; i < steps.length; i++) {
        spans.push({
            message: steps[i].message,
            ms: (i + 1 < steps.length ? steps[i + 1].time : end) - steps[i].time,
        });
    }
    const slowest = spans
        .filter((span) => span.ms > 0)
        .sort((a, b) => b.ms - a.ms)
        .slice(0, 4)
        .map((span) => `"${span.message}" ${span.ms}ms`)
        .join(", ");
    const where = ((_a = ctx._request) === null || _a === void 0 ? void 0 : _a.url)
        ? `${(_b = ctx._request.method) !== null && _b !== void 0 ? _b : ""} ${ctx._request.url}`.trim()
        : ctx.title;
    logger_1.logger.warn(ctx.module, `SLOW (${duration}ms): ${where}` +
        (slowest ? ` — ${slowest}` : " — no steps were recorded") +
        describeProcessPressure(ctx._startTime, end));
}
function completeOperation(ctx) {
    reportSlowOperation(ctx);
    if (!ctx._liveHandle)
        return;
    const duration = Date.now() - ctx._startTime;
    if (ctx._status === "success") {
        ctx._liveHandle.succeed(`${duration}`);
    }
    else {
        ctx._liveHandle.fail(`${duration}`);
    }
}
async function withLogger(module, title, data, handler, options) {
    var _a;
    const ctx = createApiContext(module, title, (_a = data.user) === null || _a === void 0 ? void 0 : _a.id, options);
    try {
        const result = await asyncLocalStorage.run(ctx, async () => {
            return await handler(ctx);
        });
        if (ctx._status === "running") {
            ctx._status = "success";
        }
        completeOperation(ctx);
        return result;
    }
    catch (error) {
        if (ctx._status === "running") {
            ctx.fail(error instanceof Error ? error.message : String(error));
        }
        completeOperation(ctx);
        throw error;
    }
}
function logged(module, title, fn) {
    return async (...args) => {
        const ctx = createApiContext(module, title);
        try {
            const result = await asyncLocalStorage.run(ctx, async () => {
                return await fn(ctx, ...args);
            });
            if (ctx._status === "running") {
                ctx._status = "success";
            }
            completeOperation(ctx);
            return result;
        }
        catch (error) {
            if (ctx._status === "running") {
                ctx.fail(error instanceof Error ? error.message : String(error));
            }
            completeOperation(ctx);
            throw error;
        }
    };
}
async function withSubOperation(label, fn) {
    const ctx = getApiContext();
    if (ctx) {
        ctx.step(label);
    }
    try {
        const result = await fn();
        if (ctx) {
            ctx.step(`${label} completed`, "success");
        }
        return result;
    }
    catch (error) {
        if (ctx) {
            ctx.step(`${label} failed: ${error instanceof Error ? error.message : error}`, "error");
        }
        throw error;
    }
}
