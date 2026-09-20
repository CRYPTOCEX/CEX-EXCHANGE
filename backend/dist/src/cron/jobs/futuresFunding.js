"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.settleFuturesFunding = settleFuturesFunding;
const console_1 = require("@b/utils/console");
const broadcast_1 = require("../broadcast");
const { models } = require("@b/db");
const { createError } = require("@b/utils/error");
const safe_imports_1 = require("@b/utils/safe-imports");
async function settleFuturesFunding(shouldBroadcast = true) {
    var _a, _b, _c, _d;
    const cronName = "settleFuturesFunding";
    try {
        if (shouldBroadcast) {
            (0, broadcast_1.broadcastStatus)(cronName, "running");
            (0, broadcast_1.broadcastLog)(cronName, "Checking perpetual funding windows");
        }
        const m = await (0, safe_imports_1.getFuturesFundingUtils)();
        if (!(m === null || m === void 0 ? void 0 : m.runFundingSettlement)) {
            if (!models.futuresMarket || await models.futuresMarket.count() > 0) {
                throw createError({ statusCode: 503, message: "Futures funding settlement implementation is missing; configured markets require recovery" });
            }
            if (shouldBroadcast) {
                (0, broadcast_1.broadcastStatus)(cronName, "completed");
                (0, broadcast_1.broadcastLog)(cronName, "No futures markets configured; funding implementation unavailable");
            }
            return;
        }
        const result = await m.runFundingSettlement();
        for (const note of (_a = result.notes) !== null && _a !== void 0 ? _a : []) {
            (0, broadcast_1.broadcastLog)(cronName, note, "warning");
            console_1.logger.warn("FUTURES_FUNDING", note);
        }
        if (shouldBroadcast) {
            (0, broadcast_1.broadcastStatus)(cronName, "completed");
            if (result.windowsSettled) {
                (0, broadcast_1.broadcastLog)(cronName, `Settled ${result.windowsSettled} funding window(s) across ${result.marketsConsidered} market(s): ` +
                    `${result.positionsCharged} charged, ${result.positionsCredited} credited, ${result.unpaid} unpaid`, "success");
            }
            else {
                (0, broadcast_1.broadcastLog)(cronName, result.marketsConsidered
                    ? `No funding window due across ${result.marketsConsidered} funded market(s)`
                    : "No market has a funding rate configured");
            }
        }
        if (Math.abs((_b = result.residual) !== null && _b !== void 0 ? _b : 0) > 1e-8) {
            console_1.logger.warn("FUTURES_FUNDING", `Funding run left a residual of ${result.residual}; collected funds were not fully distributed`);
        }
    }
    catch (error) {
        console_1.logger.error("FUTURES_FUNDING", `Funding settlement failed: ${(_c = error === null || error === void 0 ? void 0 : error.message) !== null && _c !== void 0 ? _c : error}`, error);
        if (shouldBroadcast) {
            (0, broadcast_1.broadcastStatus)(cronName, "failed");
            (0, broadcast_1.broadcastLog)(cronName, `Funding settlement failed: ${(_d = error === null || error === void 0 ? void 0 : error.message) !== null && _d !== void 0 ? _d : error}`, "error");
        }
        throw error;
    }
}
