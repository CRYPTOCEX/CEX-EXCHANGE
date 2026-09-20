"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.humanTookOver = void 0;
exports.triggerAiSupport = triggerAiSupport;
exports.triageNewTicket = triageNewTicket;
exports.notifyHumanReply = notifyHumanReply;
exports.notifyTicketClosed = notifyTicketClosed;
exports.__resetAiSupportHook = __resetAiSupportHook;
const console_1 = require("@b/utils/console");
let cached;
function resolve() {
    var _a, _b;
    if (cached !== undefined)
        return cached;
    try {
        const { requireOptionalModule } = require("@b/utils/safe-imports");
        cached = (_a = requireOptionalModule("@b/api/(ext)/ai/support/utils/trigger")) !== null && _a !== void 0 ? _a : null;
    }
    catch (error) {
        console_1.logger.error("SUPPORT", `AI support addon present but failed to load: ${(_b = error === null || error === void 0 ? void 0 : error.message) !== null && _b !== void 0 ? _b : error}`, error);
        cached = null;
    }
    return cached;
}
function triggerAiSupport(ctx) {
    const bridge = safeResolve();
    if (!(bridge === null || bridge === void 0 ? void 0 : bridge.maybeTriggerAiReply))
        return;
    Promise.resolve()
        .then(() => bridge.maybeTriggerAiReply(ctx))
        .catch((error) => {
        var _a;
        console_1.logger.error("AI_SUPPORT", `Trigger failed for ticket ${ctx.ticketId}: ${(_a = error === null || error === void 0 ? void 0 : error.message) !== null && _a !== void 0 ? _a : error}`, error);
    });
}
function triageNewTicket(ticketId, subject, message) {
    const bridge = safeResolve();
    if (!(bridge === null || bridge === void 0 ? void 0 : bridge.triageNewTicket))
        return;
    Promise.resolve()
        .then(() => bridge.triageNewTicket(ticketId, subject, message))
        .catch((error) => {
        var _a;
        console_1.logger.error("AI_SUPPORT", `Triage failed for ticket ${ticketId}: ${(_a = error === null || error === void 0 ? void 0 : error.message) !== null && _a !== void 0 ? _a : error}`, error);
    });
}
function notifyHumanReply(ticketId, adminUserId) {
    const bridge = safeResolve();
    if (!(bridge === null || bridge === void 0 ? void 0 : bridge.notifyHumanReply))
        return;
    Promise.resolve()
        .then(() => bridge.notifyHumanReply(ticketId, adminUserId))
        .catch((error) => {
        var _a;
        console_1.logger.error("AI_SUPPORT", `Human-takeover notify failed for ticket ${ticketId}: ${(_a = error === null || error === void 0 ? void 0 : error.message) !== null && _a !== void 0 ? _a : error}`, error);
    });
}
exports.humanTookOver = notifyHumanReply;
function notifyTicketClosed(ticketId) {
    const bridge = safeResolve();
    if (!(bridge === null || bridge === void 0 ? void 0 : bridge.notifyTicketClosed))
        return;
    Promise.resolve()
        .then(() => bridge.notifyTicketClosed(ticketId))
        .catch((error) => {
        var _a;
        console_1.logger.error("AI_SUPPORT", `Close notify failed for ticket ${ticketId}: ${(_a = error === null || error === void 0 ? void 0 : error.message) !== null && _a !== void 0 ? _a : error}`, error);
    });
}
function safeResolve() {
    try {
        return resolve();
    }
    catch (_a) {
        return null;
    }
}
function __resetAiSupportHook() {
    cached = undefined;
}
