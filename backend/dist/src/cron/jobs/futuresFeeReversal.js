"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sweepFuturesFeeReversals = sweepFuturesFeeReversals;
const console_1 = require("@b/utils/console");
const broadcast_1 = require("../broadcast");
const safe_imports_1 = require("@b/utils/safe-imports");
async function sweepFuturesFeeReversals(shouldBroadcast = true) {
    const cronName = "sweepFuturesFeeReversals";
    try {
        if (shouldBroadcast) {
            (0, broadcast_1.broadcastStatus)(cronName, "running");
            (0, broadcast_1.broadcastLog)(cronName, "Checking for unfinished cancel bookkeeping");
        }
        const m = await (0, safe_imports_1.getFuturesFeeReversalUtils)();
        if (!(m === null || m === void 0 ? void 0 : m.sweepOwedFeeReversals)) {
            if (shouldBroadcast) {
                (0, broadcast_1.broadcastStatus)(cronName, "completed");
                (0, broadcast_1.broadcastLog)(cronName, "Futures extension not installed; nothing to reconcile");
            }
            return;
        }
        const result = await m.sweepOwedFeeReversals();
        if (shouldBroadcast) {
            (0, broadcast_1.broadcastStatus)(cronName, "completed");
            if (result.settled || result.abandoned) {
                (0, broadcast_1.broadcastLog)(cronName, `${result.settled} fee reversal(s) settled, ${result.abandoned} abandoned, ` +
                    `${result.deferred} deferred. A settled row means a cancel was interrupted ` +
                    `before it finished its own bookkeeping.`, "warning");
            }
            else if (result.deferred) {
                (0, broadcast_1.broadcastLog)(cronName, `${result.deferred} reversal(s) deferred — either awaiting confirmation that ` +
                    `the refund landed, or failing repeatedly.`, "warning");
            }
            else {
                (0, broadcast_1.broadcastLog)(cronName, "No unfinished cancel bookkeeping");
            }
        }
        if (result.deferred > 0) {
            console_1.logger.warn("FUTURES_FEE_REVERSAL", `${result.deferred} owed fee reversal(s) could not be settled this pass. If this ` +
                `count does not fall, check futures_fee_reversal for rows with a high attempts ` +
                `count — the platform is reporting refunded fees as revenue until they clear.`);
        }
    }
    catch (error) {
        console_1.logger.error("FUTURES_FEE_REVERSAL", "Fee reversal sweep failed", error);
        if (shouldBroadcast) {
            (0, broadcast_1.broadcastStatus)(cronName, "failed", error === null || error === void 0 ? void 0 : error.message);
        }
        throw error;
    }
}
