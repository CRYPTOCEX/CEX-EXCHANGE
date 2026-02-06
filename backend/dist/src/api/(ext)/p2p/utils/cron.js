"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.p2pTradeTimeout = p2pTradeTimeout;
const console_1 = require("@b/utils/console");
const broadcast_1 = require("@b/cron/broadcast");
const p2p_trade_timeout_1 = require("./p2p-trade-timeout");
async function p2pTradeTimeout() {
    const cronName = "p2pTradeTimeout";
    const startTime = Date.now();
    try {
        (0, broadcast_1.broadcastStatus)(cronName, "running");
        (0, broadcast_1.broadcastLog)(cronName, "Starting P2P trade timeout job");
        await (0, p2p_trade_timeout_1.handleP2PTradeTimeouts)();
        const duration = Date.now() - startTime;
        (0, broadcast_1.broadcastStatus)(cronName, "completed", { duration });
        (0, broadcast_1.broadcastLog)(cronName, `P2P trade timeout job completed successfully`, "success");
    }
    catch (error) {
        console_1.logger.error("P2P_CRON", "P2P trade timeout job failed", error);
        (0, broadcast_1.broadcastStatus)(cronName, "failed", {
            duration: Date.now() - startTime,
        });
        (0, broadcast_1.broadcastLog)(cronName, `P2P trade timeout job failed: ${error.message}`, "error");
        throw error;
    }
}
exports.default = p2pTradeTimeout;
