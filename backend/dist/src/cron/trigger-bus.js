"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CRON_TRIGGER_RESULT = exports.CRON_TRIGGER_REQUEST = void 0;
exports.requestRemoteTrigger = requestRemoteTrigger;
exports.serveTriggerRequests = serveTriggerRequests;
const console_1 = require("@b/utils/console");
const settings_bus_1 = require("@b/utils/settings-bus");
exports.CRON_TRIGGER_REQUEST = "cron:trigger:request";
exports.CRON_TRIGGER_RESULT = "cron:trigger:result";
const REPLY_TIMEOUT_MS = 20000;
const pending = new Map();
let requesterReady = false;
let requestCounter = 0;
const nextRequestId = () => `${process.pid}.${Date.now().toString(36)}.${(++requestCounter).toString(36)}`;
function ensureRequester() {
    if (requesterReady)
        return;
    requesterReady = true;
    (0, settings_bus_1.subscribe)(exports.CRON_TRIGGER_RESULT, (payload) => {
        var _a, _b, _c;
        const id = String((_a = payload === null || payload === void 0 ? void 0 : payload.requestId) !== null && _a !== void 0 ? _a : "");
        const waiting = pending.get(id);
        if (!waiting)
            return;
        pending.delete(id);
        clearTimeout(waiting.timer);
        const status = String((_b = payload === null || payload === void 0 ? void 0 : payload.status) !== null && _b !== void 0 ? _b : "");
        if (status === "ran" || status === "busy" || status === "started") {
            waiting.resolve({ status });
            return;
        }
        if (status === "failed") {
            waiting.resolve({ status: "failed", message: String((_c = payload === null || payload === void 0 ? void 0 : payload.message) !== null && _c !== void 0 ? _c : "unknown error") });
            return;
        }
        waiting.resolve({ status: "unreachable" });
    });
}
async function requestRemoteTrigger(name) {
    ensureRequester();
    const requestId = nextRequestId();
    const outcome = new Promise((resolve) => {
        var _a;
        const timer = setTimeout(() => {
            pending.delete(requestId);
            resolve({ status: "unreachable" });
        }, REPLY_TIMEOUT_MS);
        (_a = timer.unref) === null || _a === void 0 ? void 0 : _a.call(timer);
        pending.set(requestId, { resolve, timer });
    });
    await (0, settings_bus_1.publish)(exports.CRON_TRIGGER_REQUEST, { requestId, cronName: name });
    return outcome;
}
function serveTriggerRequests(run) {
    (0, settings_bus_1.subscribe)(exports.CRON_TRIGGER_REQUEST, (payload) => {
        var _a;
        var _b, _c;
        const requestId = String((_b = payload === null || payload === void 0 ? void 0 : payload.requestId) !== null && _b !== void 0 ? _b : "");
        const cronName = String((_c = payload === null || payload === void 0 ? void 0 : payload.cronName) !== null && _c !== void 0 ? _c : "");
        if (!requestId || !cronName)
            return;
        let settled = false;
        const reply = (result) => {
            if (settled)
                return;
            settled = true;
            void (0, settings_bus_1.publish)(exports.CRON_TRIGGER_RESULT, { requestId, ...result });
        };
        const startedTimer = setTimeout(() => reply({ status: "started" }), REPLY_TIMEOUT_MS - 2000);
        (_a = startedTimer.unref) === null || _a === void 0 ? void 0 : _a.call(startedTimer);
        void (async () => {
            var _a;
            try {
                const ok = await run(cronName);
                reply({ status: ok ? "ran" : "busy" });
            }
            catch (error) {
                reply({ status: "failed", message: String((_a = error === null || error === void 0 ? void 0 : error.message) !== null && _a !== void 0 ? _a : error) });
            }
            finally {
                clearTimeout(startedTimer);
            }
        })();
    });
    console_1.logger.info("CRON", "Serving manual cron triggers for delegated processes over the settings bus.");
}
