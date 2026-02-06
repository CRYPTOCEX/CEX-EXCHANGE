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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.processWalletPnl = processWalletPnl;
exports.cleanupOldPnlRecords = cleanupOldPnlRecords;
exports.processSpotPendingDeposits = processSpotPendingDeposits;
exports.getPendingSpotTransactionsQuery = getPendingSpotTransactionsQuery;
exports.processPendingWithdrawals = processPendingWithdrawals;
const exchange_1 = __importDefault(require("@b/utils/exchange"));
const db_1 = require("@b/db");
const console_1 = require("@b/utils/console");
const sequelize_1 = require("sequelize");
const date_fns_1 = require("date-fns");
const broadcast_1 = require("../broadcast");
const index_ws_1 = require("@b/api/finance/deposit/spot/index.ws");
const spot_1 = require("@b/utils/spot");
const utils_1 = require("@b/api/finance/utils");
const notifications_1 = require("@b/utils/notifications");
const walletTask_1 = require("./walletTask");
async function getMatchingEngine() {
    try {
        const matchingEngineModule = await Promise.resolve().then(() => __importStar(require("@b/api/(ext)/ecosystem/utils/matchingEngine")));
        return matchingEngineModule.MatchingEngine.getInstance();
    }
    catch (error) {
        return {
            getTickers: async () => ({})
        };
    }
}
async function processWalletPnl() {
    const cronName = "processWalletPnl";
    const startTime = Date.now();
    try {
        (0, broadcast_1.broadcastStatus)(cronName, "running");
        (0, broadcast_1.broadcastLog)(cronName, "Starting wallet PnL processing");
        const users = await db_1.models.user.findAll({ attributes: ["id"] });
        (0, broadcast_1.broadcastLog)(cronName, `Found ${users.length} users to process`);
        for (const user of users) {
            (0, broadcast_1.broadcastLog)(cronName, `Scheduling PnL task for user ${user.id}`);
            walletTask_1.walletPnlTaskQueue.add(() => handlePnl(user));
        }
        (0, broadcast_1.broadcastStatus)(cronName, "completed", {
            duration: Date.now() - startTime,
        });
        (0, broadcast_1.broadcastLog)(cronName, "Wallet PnL processing scheduled", "success");
    }
    catch (error) {
        console_1.logger.error("CRON", "Wallet PnL processing failed", error);
        (0, broadcast_1.broadcastStatus)(cronName, "failed");
        (0, broadcast_1.broadcastLog)(cronName, `Wallet PnL processing failed: ${error.message}`, "error");
        throw error;
    }
}
const handlePnl = async (user) => {
    var _a;
    const cronName = "processWalletPnl";
    try {
        (0, broadcast_1.broadcastLog)(cronName, `Handling PnL for user ${user.id}`);
        const wallets = await db_1.models.wallet.findAll({
            where: { userId: user.id },
            attributes: ["currency", "balance", "type"],
        });
        (0, broadcast_1.broadcastLog)(cronName, `User ${user.id} has ${wallets.length} wallets`);
        if (!wallets.length) {
            (0, broadcast_1.broadcastLog)(cronName, `No wallets found for user ${user.id}`, "info");
            return;
        }
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        (0, broadcast_1.broadcastLog)(cronName, `Today date set to ${today.toISOString()}`);
        const uniqueCurrencies = Array.from(wallets.map((w) => w.currency));
        (0, broadcast_1.broadcastLog)(cronName, `Unique currencies for user ${user.id}: ${uniqueCurrencies.join(", ")}`);
        const [todayPnl, currencyPrices, exchangePrices, engine] = await Promise.all([
            db_1.models.walletPnl.findOne({
                where: {
                    userId: user.id,
                    createdAt: { [sequelize_1.Op.gte]: today },
                },
                attributes: ["id", "balances"],
            }),
            db_1.models.currency.findAll({
                where: { id: uniqueCurrencies },
                attributes: ["id", "price"],
            }),
            db_1.models.exchangeCurrency.findAll({
                where: { currency: uniqueCurrencies },
                attributes: ["currency", "price"],
            }),
            getMatchingEngine(),
        ]);
        (0, broadcast_1.broadcastLog)(cronName, `Parallel queries completed for user ${user.id}`);
        const tickers = await engine.getTickers();
        (0, broadcast_1.broadcastLog)(cronName, "Tickers fetched from MatchingEngine");
        const currencyMap = new Map(currencyPrices.map((item) => [item.id, item.price]));
        const exchangeMap = new Map(exchangePrices.map((item) => [item.currency, item.price]));
        const balances = { FIAT: 0, SPOT: 0, ECO: 0 };
        for (const wallet of wallets) {
            let price;
            if (wallet.type === "FIAT") {
                price = currencyMap.get(wallet.currency);
            }
            else if (wallet.type === "SPOT") {
                price = exchangeMap.get(wallet.currency);
            }
            else if (wallet.type === "ECO") {
                price = ((_a = tickers[wallet.currency]) === null || _a === void 0 ? void 0 : _a.last) || 0;
            }
            if (price) {
                balances[wallet.type] += price * wallet.balance;
            }
        }
        (0, broadcast_1.broadcastLog)(cronName, `Calculated balances for user ${user.id}: FIAT=${balances.FIAT}, SPOT=${balances.SPOT}, ECO=${balances.ECO}`);
        if (Object.values(balances).some((balance) => balance > 0)) {
            if (todayPnl) {
                await todayPnl.update({ balances });
                (0, broadcast_1.broadcastLog)(cronName, `Updated today's PnL record for user ${user.id}`, "success");
            }
            else {
                await db_1.models.walletPnl.create({
                    userId: user.id,
                    balances,
                    createdAt: today,
                });
                (0, broadcast_1.broadcastLog)(cronName, `Created new PnL record for user ${user.id}`, "success");
            }
        }
        else {
            (0, broadcast_1.broadcastLog)(cronName, `No positive balances to record for user ${user.id}`, "info");
        }
    }
    catch (error) {
        console_1.logger.error("CRON", `Error handling PnL for user ${user.id}`, error);
        (0, broadcast_1.broadcastLog)("processWalletPnl", `Error handling PnL for user ${user.id}: ${error.message}`, "error");
        throw error;
    }
};
async function cleanupOldPnlRecords() {
    const cronName = "cleanupOldPnlRecords";
    try {
        (0, broadcast_1.broadcastStatus)(cronName, "running");
        (0, broadcast_1.broadcastLog)(cronName, "Starting cleanup of old PnL records");
        const oneMonthAgo = (0, date_fns_1.subDays)(new Date(), 30);
        const yesterday = (0, date_fns_1.subDays)(new Date(), 1);
        const zeroBalanceString = '{"FIAT":0,"SPOT":0,"ECO":0}';
        const zeroBalanceObject = { FIAT: 0, SPOT: 0, ECO: 0 };
        (0, broadcast_1.broadcastLog)(cronName, "Deleting PnL records older than one month");
        await db_1.models.walletPnl.destroy({
            where: { createdAt: { [sequelize_1.Op.lt]: oneMonthAgo } },
        });
        (0, broadcast_1.broadcastLog)(cronName, "Deleted PnL records older than one month", "success");
        (0, broadcast_1.broadcastLog)(cronName, "Deleting PnL records older than yesterday with zero balance");
        await db_1.models.walletPnl.destroy({
            where: {
                createdAt: { [sequelize_1.Op.lt]: yesterday },
                [sequelize_1.Op.or]: [
                    { balances: zeroBalanceString },
                    { balances: zeroBalanceObject },
                ],
            },
        });
        (0, broadcast_1.broadcastLog)(cronName, "Deleted PnL records older than yesterday with zero balance", "success");
        (0, broadcast_1.broadcastStatus)(cronName, "completed");
        (0, broadcast_1.broadcastLog)(cronName, "Cleanup of old PnL records completed", "success");
    }
    catch (error) {
        console_1.logger.error("CRON", "Cleanup of old PnL records failed", error);
        (0, broadcast_1.broadcastStatus)(cronName, "failed");
        (0, broadcast_1.broadcastLog)(cronName, `Cleanup of old PnL records failed: ${error.message}`, "error");
    }
}
async function processSpotPendingDeposits() {
    const cronName = "processSpotPendingDeposits";
    try {
        (0, broadcast_1.broadcastStatus)(cronName, "running");
        (0, broadcast_1.broadcastLog)(cronName, "Starting processing of pending spot deposits");
        const transactions = await getPendingSpotTransactionsQuery("DEPOSIT");
        (0, broadcast_1.broadcastLog)(cronName, `Found ${transactions.length} pending deposit transactions`);
        for (const transaction of transactions) {
            const transactionId = transaction.id;
            const userId = transaction.userId;
            const trx = transaction.referenceId;
            if (!trx) {
                (0, broadcast_1.broadcastLog)(cronName, `Transaction ${transactionId} has no referenceId; skipping`, "info");
                continue;
            }
            if (!index_ws_1.spotVerificationIntervals.has(transactionId)) {
                (0, index_ws_1.startSpotVerificationSchedule)(transactionId, userId, trx);
                (0, broadcast_1.broadcastLog)(cronName, `Started verification for transaction ${transactionId}`, "info");
            }
            else {
                (0, broadcast_1.broadcastLog)(cronName, `Verification already scheduled for transaction ${transactionId}`, "info");
            }
        }
        (0, broadcast_1.broadcastStatus)(cronName, "completed");
        (0, broadcast_1.broadcastLog)(cronName, "Processing pending spot deposits completed", "success");
    }
    catch (error) {
        console_1.logger.error("CRON", "Processing pending spot deposits failed", error);
        (0, broadcast_1.broadcastStatus)(cronName, "failed");
        (0, broadcast_1.broadcastLog)(cronName, `Processing pending spot deposits failed: ${error.message}`, "error");
        throw error;
    }
}
async function getPendingSpotTransactionsQuery(type) {
    try {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const transactions = await db_1.models.transaction.findAll({
            where: {
                status: "PENDING",
                type,
                createdAt: {
                    [sequelize_1.Op.between]: [oneHourAgo, new Date()],
                },
                [sequelize_1.Op.and]: [
                    { referenceId: { [sequelize_1.Op.ne]: null } },
                    { referenceId: { [sequelize_1.Op.ne]: "" } },
                ],
            },
            include: [
                {
                    model: db_1.models.wallet,
                    as: "wallet",
                    attributes: ["id", "currency"],
                },
            ],
        });
        return transactions;
    }
    catch (error) {
        console_1.logger.error("CRON", "Error getting pending spot transactions", error);
        throw error;
    }
}
async function processPendingWithdrawals() {
    const cronName = "processPendingWithdrawals";
    try {
        (0, broadcast_1.broadcastStatus)(cronName, "running");
        (0, broadcast_1.broadcastLog)(cronName, "Starting processing pending withdrawals");
        const transactions = await getPendingSpotTransactionsQuery("WITHDRAW");
        (0, broadcast_1.broadcastLog)(cronName, `Found ${transactions.length} pending withdrawal transactions`);
        for (const transaction of transactions) {
            (0, broadcast_1.broadcastLog)(cronName, `Processing withdrawal transaction ${transaction.id}`);
            const userId = transaction.userId;
            const trx = transaction.referenceId;
            if (!trx) {
                (0, broadcast_1.broadcastLog)(cronName, `Transaction ${transaction.id} has no referenceId; skipping`, "info");
                continue;
            }
            const exchange = await exchange_1.default.startExchange();
            (0, broadcast_1.broadcastLog)(cronName, `Exchange started for processing transaction ${transaction.id}`);
            try {
                const { wallet } = transaction;
                (0, broadcast_1.broadcastLog)(cronName, `Fetching withdrawals for currency ${wallet === null || wallet === void 0 ? void 0 : wallet.currency} for transaction ${transaction.id}`);
                const withdrawals = await exchange.fetchWithdrawals(wallet === null || wallet === void 0 ? void 0 : wallet.currency);
                const withdrawData = withdrawals.find((w) => w.id === trx);
                let withdrawStatus = "PENDING";
                if (withdrawData) {
                    switch (withdrawData.status) {
                        case "completed":
                        case "ok":
                            withdrawStatus = "COMPLETED";
                            break;
                        case "cancelled":
                        case "canceled":
                            withdrawStatus = "CANCELLED";
                            break;
                        case "failed":
                            withdrawStatus = "FAILED";
                            break;
                    }
                    (0, broadcast_1.broadcastLog)(cronName, `Withdrawal data for transaction ${transaction.id} returned status ${withdrawData.status}`);
                }
                else {
                    (0, broadcast_1.broadcastLog)(cronName, `No withdrawal data found for transaction ${transaction.id}`, "info");
                }
                if (!withdrawStatus)
                    continue;
                if (transaction.status === withdrawStatus) {
                    (0, broadcast_1.broadcastLog)(cronName, `Transaction ${transaction.id} already has status ${withdrawStatus}; skipping update`, "info");
                    continue;
                }
                await (0, utils_1.updateTransaction)(transaction.id, { status: withdrawStatus });
                (0, broadcast_1.broadcastLog)(cronName, `Transaction ${transaction.id} status updated to ${withdrawStatus}`, "success");
                if (withdrawStatus === "FAILED" || withdrawStatus === "CANCELLED") {
                    await (0, spot_1.updateSpotWalletBalance)(userId, wallet === null || wallet === void 0 ? void 0 : wallet.currency, Number(transaction.amount), Number(transaction.fee), "REFUND_WITHDRAWAL");
                    await (0, notifications_1.createNotification)({
                        userId,
                        relatedId: transaction.id,
                        title: "Withdrawal Failed",
                        message: `Your withdrawal of ${transaction.amount} ${wallet === null || wallet === void 0 ? void 0 : wallet.currency} has failed.`,
                        type: "system",
                        link: `/finance/wallet/withdrawals/${transaction.id}`,
                        actions: [
                            {
                                label: "View Withdrawal",
                                link: `/finance/wallet/withdrawals/${transaction.id}`,
                                primary: true,
                            },
                        ],
                    });
                    (0, broadcast_1.broadcastLog)(cronName, `Processed failed withdrawal ${transaction.id}`, "info");
                }
            }
            catch (error) {
                console_1.logger.error("CRON", `Error processing withdrawal ${transaction.id}`, error);
                (0, broadcast_1.broadcastLog)(cronName, `Error processing withdrawal ${transaction.id}: ${error.message}`, "error");
                continue;
            }
        }
        (0, broadcast_1.broadcastStatus)(cronName, "completed");
        (0, broadcast_1.broadcastLog)(cronName, "Processing pending withdrawals completed", "success");
    }
    catch (error) {
        console_1.logger.error("CRON", "Processing pending withdrawals failed", error);
        (0, broadcast_1.broadcastStatus)(cronName, "failed");
        (0, broadcast_1.broadcastLog)(cronName, `Processing pending withdrawals failed: ${error.message}`, "error");
        throw error;
    }
}
