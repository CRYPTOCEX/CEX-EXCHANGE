"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processPendingOrders = processPendingOrders;
const console_1 = require("@b/utils/console");
const BinaryOrderService_1 = require("@b/api/exchange/binary/order/util/BinaryOrderService");
const broadcast_1 = require("../broadcast");
async function processPendingOrders(shouldBroadcast = true) {
    const cronName = "processPendingOrders";
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 5000;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            if (shouldBroadcast) {
                (0, broadcast_1.broadcastStatus)(cronName, "running");
                const attemptMsg = attempt > 1 ? ` (attempt ${attempt}/${MAX_RETRIES})` : "";
                (0, broadcast_1.broadcastLog)(cronName, `Starting processing pending orders${attemptMsg}`);
            }
            await BinaryOrderService_1.BinaryOrderService.processPendingOrders(shouldBroadcast);
            if (shouldBroadcast) {
                (0, broadcast_1.broadcastStatus)(cronName, "completed");
                (0, broadcast_1.broadcastLog)(cronName, "Processing pending orders completed", "success");
            }
            return;
        }
        catch (error) {
            const isLastAttempt = attempt === MAX_RETRIES;
            console_1.logger.error("CRON", `Processing pending orders failed (attempt ${attempt}/${MAX_RETRIES})`, error);
            if (isLastAttempt) {
                if (shouldBroadcast) {
                    (0, broadcast_1.broadcastStatus)(cronName, "failed");
                    (0, broadcast_1.broadcastLog)(cronName, `Processing pending orders failed after ${MAX_RETRIES} attempts: ${error.message}`, "error");
                }
                throw error;
            }
            if (shouldBroadcast) {
                (0, broadcast_1.broadcastLog)(cronName, `Attempt ${attempt} failed, retrying in ${RETRY_DELAY / 1000}s...`, "warning");
            }
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        }
    }
}
