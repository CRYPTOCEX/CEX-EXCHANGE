"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.poolBackingReconcile = poolBackingReconcile;
exports.poolBackingSettle = poolBackingSettle;
const console_1 = require("@b/utils/console");
const broadcast_1 = require("../broadcast");
const reconcile_1 = require("@b/utils/pool-backing/reconcile");
const engine_1 = require("@b/utils/pool-backing/engine");
async function poolBackingReconcile() {
    const cronName = "poolBackingReconcile";
    try {
        (0, broadcast_1.broadcastStatus)(cronName, "running");
        (0, broadcast_1.broadcastLog)(cronName, "Starting pool-backing reconciliation");
        const summary = await (0, reconcile_1.runPoolBackingReconciliation)({ trigger: "cron" });
        if (summary.skipped) {
            (0, broadcast_1.broadcastLog)(cronName, `Skipped: ${summary.skipped}`, "info");
        }
        else {
            const ecosystemErrors = Number(summary.ecosystemErrors) || 0;
            (0, broadcast_1.broadcastLog)(cronName, `${summary.currencies} currencies reconciled; exchange holdings ${summary.holdingsReadable ? "read" : "UNKNOWN"}; ` +
                `ecosystem side read for ${summary.ecosystemSides} currenc${summary.ecosystemSides === 1 ? "y" : "ies"}` +
                (ecosystemErrors ? `, NOT read for ${ecosystemErrors}` : "") +
                `; ${summary.newDrift.length} new drift; ${summary.alerts.length} alert(s)`, summary.holdingsReadable && !ecosystemErrors ? "success" : "warning");
            for (const alert of summary.alerts)
                (0, broadcast_1.broadcastLog)(cronName, alert, "warning");
        }
        (0, broadcast_1.broadcastStatus)(cronName, "completed");
    }
    catch (error) {
        console_1.logger.error("CRON", "Pool-backing reconciliation failed", error);
        (0, broadcast_1.broadcastStatus)(cronName, "failed");
        (0, broadcast_1.broadcastLog)(cronName, `Pool-backing reconciliation failed: ${error.message}`, "error");
        throw error;
    }
}
async function poolBackingSettle() {
    var _a, _b;
    const cronName = "poolBackingSettle";
    try {
        (0, broadcast_1.broadcastStatus)(cronName, "running");
        (0, broadcast_1.broadcastLog)(cronName, "Starting pool-backing settlement cycle");
        const summary = await (0, engine_1.runPoolBackingSettlementCycle)({ trigger: "cron" });
        if (summary.skipped) {
            (0, broadcast_1.broadcastLog)(cronName, `Skipped: ${summary.skipped}`, "info");
        }
        else {
            (0, broadcast_1.broadcastLog)(cronName, `${summary.verified} in-flight settlement(s) verified; ${summary.planned.length} planned; ${summary.refusals.length} refusal(s)` +
                (summary.planningSkipped ? `; planning skipped: ${summary.planningSkipped}` : "") +
                (summary.paused ? "; PAUSED" : ""), summary.refusals.length ? "warning" : "success");
            for (const p of summary.planned) {
                (0, broadcast_1.broadcastLog)(cronName, `${p.currency}: ${p.action} ${(_a = p.amount) !== null && _a !== void 0 ? _a : ""} on ${(_b = p.chain) !== null && _b !== void 0 ? _b : "?"} (settlement ${p.settlementId})`, "info");
            }
            for (const r of summary.refusals)
                (0, broadcast_1.broadcastLog)(cronName, `${r.currency}: ${r.reason}`, "warning");
        }
        (0, broadcast_1.broadcastStatus)(cronName, "completed");
    }
    catch (error) {
        console_1.logger.error("CRON", "Pool-backing settlement cycle failed", error);
        (0, broadcast_1.broadcastStatus)(cronName, "failed");
        (0, broadcast_1.broadcastLog)(cronName, `Pool-backing settlement cycle failed: ${error.message}`, "error");
        throw error;
    }
}
