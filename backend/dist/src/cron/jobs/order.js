"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.sweepFuturesPositions = sweepFuturesPositions;
exports.processPendingOrders = processPendingOrders;
exports.processPendingSpotOrders = processPendingSpotOrders;
exports.ecosystemWithdrawRecon = ecosystemWithdrawRecon;
exports.verifyPendingEcoDeposits = verifyPendingEcoDeposits;
exports.reconcileFuturesPositions = reconcileFuturesPositions;
exports.reconcileFuturesOrders = reconcileFuturesOrders;
const console_1 = require("@b/utils/console");
const BinaryOrderService_1 = require("@b/api/exchange/binary/order/util/BinaryOrderService");
const processPendingSpotOrders_1 = require("@b/api/exchange/order/util/processPendingSpotOrders");
const safe_imports_1 = require("@b/utils/safe-imports");
const broadcast_1 = require("../broadcast");
let futuresOrderReconcilerUtils = null;
let futuresOrderReconcilerChecked = false;
async function getFuturesOrderReconciler() {
    if (!futuresOrderReconcilerChecked) {
        try {
            futuresOrderReconcilerUtils = await Promise.resolve().then(() => __importStar(require("@b/api/(ext)/futures/utils/reconciler-orders")));
            futuresOrderReconcilerChecked = true;
        }
        catch (e) {
            if (!(0, safe_imports_1.isMissingOptionalAddon)(e, __filename))
                throw e;
            futuresOrderReconcilerUtils = null;
            futuresOrderReconcilerChecked = true;
        }
    }
    return futuresOrderReconcilerUtils;
}
let futuresMarkMonitor = null;
let futuresMarkMonitorChecked = false;
async function getFuturesMarkMonitor() {
    if (!futuresMarkMonitorChecked) {
        try {
            futuresMarkMonitor = await Promise.resolve().then(() => __importStar(require("@b/api/(ext)/futures/utils/markMonitor")));
            futuresMarkMonitorChecked = true;
        }
        catch (e) {
            if (!(0, safe_imports_1.isMissingOptionalAddon)(e, __filename))
                throw e;
            futuresMarkMonitor = null;
            futuresMarkMonitorChecked = true;
        }
    }
    return futuresMarkMonitor;
}
async function sweepFuturesPositions(shouldBroadcast = true) {
    var _a, _b;
    const cronName = "sweepFuturesPositions";
    try {
        if (shouldBroadcast) {
            (0, broadcast_1.broadcastStatus)(cronName, "running");
            (0, broadcast_1.broadcastLog)(cronName, "Starting futures mark sweep");
        }
        const m = await getFuturesMarkMonitor();
        let summary = { scanned: 0, exited: 0, liquidated: 0 };
        if (m === null || m === void 0 ? void 0 : m.sweepFuturesPositions) {
            summary = await m.sweepFuturesPositions();
        }
        else {
            console_1.logger.debug("FUTURES_MARK", "Futures mark monitor unavailable; skipping sweep");
        }
        if (shouldBroadcast) {
            (0, broadcast_1.broadcastStatus)(cronName, "completed");
            (0, broadcast_1.broadcastLog)(cronName, `Futures mark sweep completed (scanned ${summary.scanned}, exited ${summary.exited}, liquidated ${summary.liquidated})`, "success");
        }
    }
    catch (error) {
        console_1.logger.error("FUTURES_MARK", `Futures mark sweep failed: ${(_a = error === null || error === void 0 ? void 0 : error.message) !== null && _a !== void 0 ? _a : error}`, error);
        if (shouldBroadcast) {
            (0, broadcast_1.broadcastStatus)(cronName, "failed");
            (0, broadcast_1.broadcastLog)(cronName, `Futures mark sweep failed: ${(_b = error === null || error === void 0 ? void 0 : error.message) !== null && _b !== void 0 ? _b : error}`, "error");
        }
        throw error;
    }
}
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
async function processPendingSpotOrders(shouldBroadcast = true) {
    var _a, _b;
    const cronName = "processPendingSpotOrders";
    try {
        if (shouldBroadcast) {
            (0, broadcast_1.broadcastStatus)(cronName, "running");
            (0, broadcast_1.broadcastLog)(cronName, "Starting spot order reconciliation");
        }
        await (0, processPendingSpotOrders_1.processPendingSpotOrders)();
        if (shouldBroadcast) {
            (0, broadcast_1.broadcastStatus)(cronName, "completed");
            (0, broadcast_1.broadcastLog)(cronName, "Spot order reconciliation completed", "success");
        }
    }
    catch (error) {
        console_1.logger.error("SPOT_RECON", `Spot order reconciliation failed: ${(_a = error === null || error === void 0 ? void 0 : error.message) !== null && _a !== void 0 ? _a : error}`, error);
        if (shouldBroadcast) {
            (0, broadcast_1.broadcastStatus)(cronName, "failed");
            (0, broadcast_1.broadcastLog)(cronName, `Spot order reconciliation failed: ${(_b = error === null || error === void 0 ? void 0 : error.message) !== null && _b !== void 0 ? _b : error}`, "error");
        }
        throw error;
    }
}
async function ecosystemWithdrawRecon(shouldBroadcast = true) {
    var _a, _b;
    const cronName = "ecosystemWithdrawRecon";
    try {
        if (shouldBroadcast) {
            (0, broadcast_1.broadcastStatus)(cronName, "running");
            (0, broadcast_1.broadcastLog)(cronName, "Starting ecosystem withdrawal reconciliation");
        }
        const m = await (0, safe_imports_1.getEcosystemCronUtils)();
        if (m === null || m === void 0 ? void 0 : m.ecosystemWithdrawRecon) {
            await m.ecosystemWithdrawRecon();
        }
        else {
            console_1.logger.debug("ECO_WITHDRAW_RECON", "Ecosystem cron utils unavailable; skipping recon");
        }
        if (shouldBroadcast) {
            (0, broadcast_1.broadcastStatus)(cronName, "completed");
            (0, broadcast_1.broadcastLog)(cronName, "Ecosystem withdrawal reconciliation completed", "success");
        }
    }
    catch (error) {
        console_1.logger.error("ECO_WITHDRAW_RECON", `Ecosystem withdrawal reconciliation failed: ${(_a = error === null || error === void 0 ? void 0 : error.message) !== null && _a !== void 0 ? _a : error}`, error);
        if (shouldBroadcast) {
            (0, broadcast_1.broadcastStatus)(cronName, "failed");
            (0, broadcast_1.broadcastLog)(cronName, `Ecosystem withdrawal reconciliation failed: ${(_b = error === null || error === void 0 ? void 0 : error.message) !== null && _b !== void 0 ? _b : error}`, "error");
        }
        throw error;
    }
}
async function verifyPendingEcoDeposits(shouldBroadcast = true) {
    var _a, _b;
    const cronName = "verifyPendingEcoDeposits";
    try {
        if (shouldBroadcast) {
            (0, broadcast_1.broadcastStatus)(cronName, "running");
            (0, broadcast_1.broadcastLog)(cronName, "Verifying pending ecosystem deposits");
        }
        const m = await (0, safe_imports_1.getEcosystemCronUtils)();
        if (m === null || m === void 0 ? void 0 : m.verifyPendingEcoDeposits) {
            await m.verifyPendingEcoDeposits();
        }
        else {
            console_1.logger.debug("ECO_DEPOSIT_VERIFY", "Ecosystem cron utils unavailable; skipping deposit verification");
        }
        if (shouldBroadcast) {
            (0, broadcast_1.broadcastStatus)(cronName, "completed");
            (0, broadcast_1.broadcastLog)(cronName, "Pending ecosystem deposit verification completed", "success");
        }
    }
    catch (error) {
        console_1.logger.error("ECO_DEPOSIT_VERIFY", `Pending ecosystem deposit verification failed: ${(_a = error === null || error === void 0 ? void 0 : error.message) !== null && _a !== void 0 ? _a : error}`, error);
        if (shouldBroadcast) {
            (0, broadcast_1.broadcastStatus)(cronName, "failed");
            (0, broadcast_1.broadcastLog)(cronName, `Pending ecosystem deposit verification failed: ${(_b = error === null || error === void 0 ? void 0 : error.message) !== null && _b !== void 0 ? _b : error}`, "error");
        }
        throw error;
    }
}
async function reconcileFuturesPositions(shouldBroadcast = true) {
    var _a, _b;
    const cronName = "reconcileFuturesPositions";
    try {
        if (shouldBroadcast) {
            (0, broadcast_1.broadcastStatus)(cronName, "running");
            (0, broadcast_1.broadcastLog)(cronName, "Starting futures position reconciliation");
        }
        const m = await (0, safe_imports_1.getFuturesCronUtils)();
        if (m === null || m === void 0 ? void 0 : m.reconcileFuturesPositions) {
            await m.reconcileFuturesPositions();
        }
        else {
            console_1.logger.debug("FUTURES_RECON", "Futures reconciler unavailable; skipping recon");
        }
        if (shouldBroadcast) {
            (0, broadcast_1.broadcastStatus)(cronName, "completed");
            (0, broadcast_1.broadcastLog)(cronName, "Futures position reconciliation completed", "success");
        }
    }
    catch (error) {
        console_1.logger.error("FUTURES_RECON", `Futures position reconciliation failed: ${(_a = error === null || error === void 0 ? void 0 : error.message) !== null && _a !== void 0 ? _a : error}`, error);
        if (shouldBroadcast) {
            (0, broadcast_1.broadcastStatus)(cronName, "failed");
            (0, broadcast_1.broadcastLog)(cronName, `Futures position reconciliation failed: ${(_b = error === null || error === void 0 ? void 0 : error.message) !== null && _b !== void 0 ? _b : error}`, "error");
        }
        throw error;
    }
}
async function reconcileFuturesOrders(shouldBroadcast = true) {
    var _a, _b;
    const cronName = "reconcileFuturesOrders";
    try {
        if (shouldBroadcast) {
            (0, broadcast_1.broadcastStatus)(cronName, "running");
            (0, broadcast_1.broadcastLog)(cronName, "Starting futures order reconciliation");
        }
        const m = await getFuturesOrderReconciler();
        if (m === null || m === void 0 ? void 0 : m.reconcileFuturesOrders) {
            await m.reconcileFuturesOrders();
        }
        else {
            console_1.logger.debug("FUTURES_RECON_ORDERS", "Futures order reconciler unavailable; skipping recon");
        }
        if (shouldBroadcast) {
            (0, broadcast_1.broadcastStatus)(cronName, "completed");
            (0, broadcast_1.broadcastLog)(cronName, "Futures order reconciliation completed", "success");
        }
    }
    catch (error) {
        console_1.logger.error("FUTURES_RECON_ORDERS", `Futures order reconciliation failed: ${(_a = error === null || error === void 0 ? void 0 : error.message) !== null && _a !== void 0 ? _a : error}`, error);
        if (shouldBroadcast) {
            (0, broadcast_1.broadcastStatus)(cronName, "failed");
            (0, broadcast_1.broadcastLog)(cronName, `Futures order reconciliation failed: ${(_b = error === null || error === void 0 ? void 0 : error.message) !== null && _b !== void 0 ? _b : error}`, "error");
        }
        throw error;
    }
}
