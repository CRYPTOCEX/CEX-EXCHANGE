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
const asyncLocalStorage = new async_hooks_1.AsyncLocalStorage();
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
function completeOperation(ctx) {
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
