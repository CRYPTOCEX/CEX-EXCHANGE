"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.processPendingEcoWithdrawals = processPendingEcoWithdrawals;
exports.ecosystemWithdrawRecon = ecosystemWithdrawRecon;
exports.recoverEcoWithdrawalsAtBoot = recoverEcoWithdrawalsAtBoot;
const withdrawalQueue_1 = __importDefault(require("./withdrawalQueue"));
const console_1 = require("@b/utils/console");
const WATCHDOG_STALE_MS = 3 * 60 * 1000;
async function processPendingEcoWithdrawals() {
    var _a;
    try {
        const queue = withdrawalQueue_1.default.getInstance();
        const recovered = await queue.recoverPendingTransactions(WATCHDOG_STALE_MS, true);
        if (recovered > 0) {
            console_1.logger.info("WITHDRAW", `processPendingEcoWithdrawals: re-enqueued ${recovered} stale withdrawal(s)`);
        }
    }
    catch (error) {
        console_1.logger.error("WITHDRAW", `processPendingEcoWithdrawals failed: ${(_a = error === null || error === void 0 ? void 0 : error.message) !== null && _a !== void 0 ? _a : error}`);
    }
}
async function ecosystemWithdrawRecon() {
    var _a;
    try {
        const queue = withdrawalQueue_1.default.getInstance();
        const recovered = await queue.recoverPendingTransactions(WATCHDOG_STALE_MS, true);
        if (recovered > 0) {
            console_1.logger.info("WITHDRAW", `ecosystemWithdrawRecon: re-enqueued ${recovered} stale withdrawal(s)`);
        }
    }
    catch (error) {
        console_1.logger.error("WITHDRAW", `ecosystemWithdrawRecon failed: ${(_a = error === null || error === void 0 ? void 0 : error.message) !== null && _a !== void 0 ? _a : error}`);
    }
}
async function recoverEcoWithdrawalsAtBoot() {
    var _a;
    try {
        const queue = withdrawalQueue_1.default.getInstance();
        const recovered = await queue.recoverPendingTransactions(0, true);
        if (recovered > 0) {
            console_1.logger.info("WITHDRAW", `Boot-time ecosystem withdrawal recovery: re-enqueued ${recovered} row(s)`);
        }
        else {
            console_1.logger.debug("WITHDRAW", "Boot-time ecosystem withdrawal recovery: nothing to re-enqueue");
        }
    }
    catch (error) {
        console_1.logger.error("WITHDRAW", `recoverEcoWithdrawalsAtBoot failed: ${(_a = error === null || error === void 0 ? void 0 : error.message) !== null && _a !== void 0 ? _a : error}`);
    }
}
