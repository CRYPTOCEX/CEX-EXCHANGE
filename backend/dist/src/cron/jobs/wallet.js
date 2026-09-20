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
exports.reconcileSpotWithdrawals = reconcileSpotWithdrawals;
exports.processPendingWithdrawals = processPendingWithdrawals;
const exchange_1 = __importDefault(require("@b/utils/exchange"));
const db_1 = require("@b/db");
const console_1 = require("@b/utils/console");
const sequelize_1 = require("sequelize");
const date_fns_1 = require("date-fns");
const system_accounts_1 = require("@b/utils/system-accounts");
const broadcast_1 = require("../broadcast");
const index_ws_1 = require("@b/api/finance/deposit/spot/index.ws");
const utils_1 = require("@b/api/finance/deposit/spot/utils");
const spot_1 = require("@b/utils/spot");
const fees_1 = require("@b/utils/fees");
const utils_2 = require("@b/api/finance/utils");
const refund_safety_1 = require("@b/api/finance/withdraw/refund-safety");
const tx_hash_1 = require("@b/api/finance/withdraw/tx-hash");
const exchange_status_1 = require("@b/api/finance/withdraw/exchange-status");
const utils_3 = require("@b/api/finance/currency/utils");
const affiliate_1 = require("@b/utils/affiliate");
const cache_1 = require("@b/utils/cache");
const notifications_1 = require("@b/utils/notifications");
const notification_1 = require("@b/services/notification");
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
    var _a, _b;
    var _c;
    const cronName = "processWalletPnl";
    const startTime = Date.now();
    try {
        (0, broadcast_1.broadcastStatus)(cronName, "running");
        (0, broadcast_1.broadcastLog)(cronName, "Starting wallet PnL processing");
        const USER_PAGE_SIZE = 500;
        let lastId = null;
        let succeeded = 0;
        let failed = 0;
        let firstFailure = null;
        const prices = await buildPriceSnapshot();
        for (;;) {
            const users = await db_1.models.user.findAll({
                attributes: ["id"],
                where: {
                    id: {
                        ...(lastId ? { [sequelize_1.Op.gt]: lastId } : {}),
                        [sequelize_1.Op.notIn]: [...system_accounts_1.SYSTEM_ACCOUNT_IDS],
                    },
                },
                order: [["id", "ASC"]],
                limit: USER_PAGE_SIZE,
            });
            if (!users.length)
                break;
            lastId = users[users.length - 1].id;
            const ids = users.map((user) => user.id);
            const pageDayStart = new Date();
            pageDayStart.setHours(0, 0, 0, 0);
            const walletsByUser = new Map();
            const pnlByUser = new Map();
            try {
                for (const id of ids) {
                    walletsByUser.set(id, []);
                    pnlByUser.set(id, []);
                }
                const [pageWallets, pagePnl] = await Promise.all([
                    db_1.models.wallet.findAll({
                        where: { userId: { [sequelize_1.Op.in]: ids } },
                        attributes: ["userId", "currency", "balance", "inOrder", "type"],
                    }),
                    db_1.models.walletPnl.findAll({
                        where: {
                            userId: { [sequelize_1.Op.in]: ids },
                            createdAt: { [sequelize_1.Op.gte]: pageDayStart },
                        },
                        attributes: ["id", "userId", "balances", "createdAt"],
                        order: [
                            ["createdAt", "ASC"],
                            ["id", "ASC"],
                        ],
                    }),
                ]);
                for (const wallet of pageWallets) {
                    (_a = walletsByUser.get(wallet.userId)) === null || _a === void 0 ? void 0 : _a.push(wallet);
                }
                for (const row of pagePnl) {
                    (_b = pnlByUser.get(row.userId)) === null || _b === void 0 ? void 0 : _b.push(row);
                }
            }
            catch (error) {
                walletsByUser.clear();
                pnlByUser.clear();
                console_1.logger.error("CRON", "Wallet PnL page prefetch failed; falling back to per-user queries", error);
            }
            const results = await Promise.allSettled(users.map((user) => walletTask_1.walletPnlTaskQueue.add(() => handlePnl(user, prices, walletsByUser.get(user.id), pnlByUser.get(user.id)))));
            for (const result of results) {
                if (result.status === "rejected") {
                    failed++;
                    if (!firstFailure)
                        firstFailure = result.reason;
                }
                else {
                    succeeded++;
                }
            }
            if (users.length < USER_PAGE_SIZE)
                break;
            await new Promise((resolve) => setImmediate(resolve));
        }
        const total = succeeded + failed;
        (0, broadcast_1.broadcastLog)(cronName, `Wallet PnL processing finished: ${succeeded} succeeded, ${failed} failed`, failed > 0 ? "error" : "success");
        if (failed > 0) {
            console_1.logger.error("CRON", `Wallet PnL failed for ${failed}/${total} users`, firstFailure);
            if (failed * 2 >= total) {
                throw new Error(`Wallet PnL failed for ${failed} of ${total} users: ${(_c = firstFailure === null || firstFailure === void 0 ? void 0 : firstFailure.message) !== null && _c !== void 0 ? _c : firstFailure}`);
            }
        }
        (0, broadcast_1.broadcastStatus)(cronName, "completed", {
            duration: Date.now() - startTime,
            processed: succeeded,
            failed,
        });
    }
    catch (error) {
        console_1.logger.error("CRON", "Wallet PnL processing failed", error);
        (0, broadcast_1.broadcastStatus)(cronName, "failed");
        (0, broadcast_1.broadcastLog)(cronName, `Wallet PnL processing failed: ${error.message}`, "error");
        throw error;
    }
}
const buildPriceSnapshot = async () => {
    const [currencyPrices, exchangePrices, engine] = await Promise.all([
        db_1.models.currency.findAll({ attributes: ["id", "price"] }),
        db_1.models.exchangeCurrency.findAll({ attributes: ["currency", "price"] }),
        getMatchingEngine(),
    ]);
    const tickers = await engine.getTickers();
    const currencyMap = new Map();
    for (const item of currencyPrices) {
        const usd = (0, utils_3.fiatUsdPriceFromStored)(item.price);
        if (usd !== null)
            currencyMap.set(item.id, usd);
    }
    const exchangeMap = new Map();
    for (const item of exchangePrices) {
        const price = Number(item.price);
        if (Number.isFinite(price) && price > 0)
            exchangeMap.set(item.currency, price);
    }
    const ecoPriceMap = (0, utils_3.indexTickersByBaseAsset)(tickers);
    return { currencyMap, exchangeMap, ecoPriceMap };
};
const handlePnl = async (user, prices, prefetchedWallets, prefetchedPnl) => {
    if ((0, system_accounts_1.isSystemAccountId)(user === null || user === void 0 ? void 0 : user.id))
        return;
    try {
        const wallets = prefetchedWallets !== null && prefetchedWallets !== void 0 ? prefetchedWallets : (await db_1.models.wallet.findAll({
            where: { userId: user.id },
            attributes: ["currency", "balance", "inOrder", "type"],
        }));
        if (!wallets.length)
            return;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        let todayPnl = prefetchedPnl
            ? prefetchedPnl.find((row) => new Date(row.createdAt).getTime() >= today.getTime())
            : await db_1.models.walletPnl.findOne({
                where: {
                    userId: user.id,
                    createdAt: { [sequelize_1.Op.gte]: today },
                },
                attributes: ["id", "balances"],
            });
        const { currencyMap, exchangeMap, ecoPriceMap } = prices;
        const balances = { FIAT: 0, SPOT: 0, ECO: 0, FUTURES: 0 };
        for (const wallet of wallets) {
            let price;
            if (wallet.type === "FIAT") {
                price = currencyMap.get(wallet.currency);
            }
            else if (wallet.type === "SPOT") {
                price = exchangeMap.get(wallet.currency);
            }
            else if (wallet.type === "ECO" || wallet.type === "FUTURES") {
                price = exchangeMap.get(wallet.currency) || ecoPriceMap.get(wallet.currency) || 0;
            }
            if (price) {
                const settled = (Number(wallet.balance) || 0) + (Number(wallet.inOrder) || 0);
                balances[wallet.type] += price * settled;
            }
        }
        if (!todayPnl && prefetchedPnl) {
            todayPnl = await db_1.models.walletPnl.findOne({
                where: {
                    userId: user.id,
                    createdAt: { [sequelize_1.Op.gte]: today },
                },
                attributes: ["id", "balances"],
            });
        }
        if (todayPnl) {
            await todayPnl.update({ balances });
        }
        else if (Object.values(balances).some((balance) => balance > 0)) {
            await db_1.models.walletPnl.create({
                userId: user.id,
                balances,
                createdAt: today,
            });
        }
    }
    catch (error) {
        console_1.logger.error("CRON", `Error handling PnL for user ${user.id}`, error);
        (0, broadcast_1.broadcastLog)("processWalletPnl", `Error handling PnL for user ${user.id}: ${error.message}`, "error");
        throw error;
    }
};
const PNL_DELETE_BATCH = 5000;
async function destroyPnlInBatches(where) {
    let total = 0;
    for (;;) {
        const removed = await db_1.models.walletPnl.destroy({
            where,
            limit: PNL_DELETE_BATCH,
        });
        total += removed;
        if (removed < PNL_DELETE_BATCH)
            return total;
        await new Promise((resolve) => setImmediate(resolve));
    }
}
async function cleanupOldPnlRecords() {
    const cronName = "cleanupOldPnlRecords";
    try {
        (0, broadcast_1.broadcastStatus)(cronName, "running");
        (0, broadcast_1.broadcastLog)(cronName, "Starting cleanup of old PnL records");
        const oneMonthAgo = (0, date_fns_1.subDays)(new Date(), 30);
        const yesterday = (0, date_fns_1.subDays)(new Date(), 1);
        const zeroBalanceString = '{"FIAT":0,"SPOT":0,"ECO":0}';
        const zeroBalanceObject = { FIAT: 0, SPOT: 0, ECO: 0 };
        const stepFailures = [];
        (0, broadcast_1.broadcastLog)(cronName, "Deleting PnL records older than one month");
        try {
            await destroyPnlInBatches({ createdAt: { [sequelize_1.Op.lt]: oneMonthAgo } });
            (0, broadcast_1.broadcastLog)(cronName, "Deleted PnL records older than one month", "success");
        }
        catch (error) {
            console_1.logger.error("CRON", "Failed deleting PnL records older than one month", error);
            (0, broadcast_1.broadcastLog)(cronName, `Failed deleting PnL records older than one month: ${error.message}`, "error");
            stepFailures.push(`old records: ${error.message}`);
        }
        (0, broadcast_1.broadcastLog)(cronName, "Deleting PnL records older than yesterday with zero balance");
        try {
            await destroyPnlInBatches({
                createdAt: { [sequelize_1.Op.lt]: yesterday },
                [sequelize_1.Op.or]: [
                    { balances: zeroBalanceString },
                    { balances: zeroBalanceObject },
                ],
            });
            (0, broadcast_1.broadcastLog)(cronName, "Deleted PnL records older than yesterday with zero balance", "success");
        }
        catch (error) {
            console_1.logger.error("CRON", "Failed deleting zero-balance PnL records", error);
            (0, broadcast_1.broadcastLog)(cronName, `Failed deleting zero-balance PnL records: ${error.message}`, "error");
            stepFailures.push(`zero-balance records: ${error.message}`);
        }
        if (stepFailures.length > 0) {
            throw new Error(`Cleanup of old PnL records failed: ${stepFailures.join("; ")}`);
        }
        (0, broadcast_1.broadcastStatus)(cronName, "completed");
        (0, broadcast_1.broadcastLog)(cronName, "Cleanup of old PnL records completed", "success");
    }
    catch (error) {
        console_1.logger.error("CRON", "Cleanup of old PnL records failed", error);
        (0, broadcast_1.broadcastStatus)(cronName, "failed");
        (0, broadcast_1.broadcastLog)(cronName, `Cleanup of old PnL records failed: ${error.message}`, "error");
        throw error;
    }
}
async function processSpotPendingDeposits() {
    var _a, _b;
    const cronName = "processSpotPendingDeposits";
    try {
        (0, broadcast_1.broadcastStatus)(cronName, "running");
        (0, broadcast_1.broadcastLog)(cronName, "Starting processing of pending spot deposits");
        const transactions = await getPendingSpotTransactionsQuery("DEPOSIT");
        (0, broadcast_1.broadcastLog)(cronName, `Found ${transactions.length} pending deposit transactions`);
        const VERIFICATION_SCHEDULE_MAX_AGE_MS = 25 * 60 * 1000;
        for (const transaction of transactions) {
            const transactionId = transaction.id;
            const userId = transaction.userId;
            const trx = transaction.referenceId;
            if (!trx) {
                (0, broadcast_1.broadcastLog)(cronName, `Transaction ${transactionId} has no referenceId; skipping`, "info");
                continue;
            }
            const ageMs = Date.now() - new Date(transaction.createdAt).getTime();
            if (ageMs >= VERIFICATION_SCHEDULE_MAX_AGE_MS) {
                try {
                    await verifyAgedSpotDeposit(cronName, transaction);
                }
                catch (error) {
                    console_1.logger.error("CRON", `Direct verification failed for deposit ${transactionId}`, error);
                    (0, broadcast_1.broadcastLog)(cronName, `Direct verification failed for deposit ${transactionId}: ${error.message}`, "error");
                }
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
        try {
            const { matchAllOpenIntents } = require("@b/utils/spot-deposit/matcher");
            const outcomes = await matchAllOpenIntents();
            const credited = outcomes.reduce((sum, o) => sum + o.credited, 0);
            const review = outcomes.reduce((sum, o) => sum + o.review, 0);
            if (outcomes.length) {
                (0, broadcast_1.broadcastLog)(cronName, `Amount matching ran for ${outcomes.length} currency/currencies: ${credited} credited, ${review} in review`, "info");
            }
        }
        catch (error) {
            console_1.logger.error("CRON", "Amount matching for open spot deposit intents failed", error);
            (0, broadcast_1.broadcastLog)(cronName, `Amount matching failed: ${error.message}`, "error");
        }
        try {
            const { expireOpenIntents } = require("@b/utils/spot-deposit/intents");
            const expired = await expireOpenIntents();
            if (expired) {
                (0, broadcast_1.broadcastLog)(cronName, `Expired ${expired} spot deposit request(s) past their window`, "info");
            }
        }
        catch (error) {
            console_1.logger.error("CRON", "Expiring open spot deposit intents failed", error);
            (0, broadcast_1.broadcastLog)(cronName, `Expiring open deposit requests failed: ${error.message}`, "error");
        }
        try {
            const { runSpotCustodyCron } = require("@b/api/(ext)/ecosystem/utils/spot-custody");
            if (typeof runSpotCustodyCron === "function") {
                const custody = await runSpotCustodyCron();
                if (custody && (custody.resweeps || custody.reconciled || custody.missed || custody.stalled || custody.aged)) {
                    (0, broadcast_1.broadcastLog)(cronName, `Spot custody recovery: ${custody.resweeps} resweep(s), ${custody.reconciled} sweep(s) reconciled, ${custody.missed} missed deposit(s) replayed, ${(_a = custody.stalled) !== null && _a !== void 0 ? _a : 0} stalled intent(s) recovered, ${(_b = custody.aged) !== null && _b !== void 0 ? _b : 0} unlisted sweep(s) parked for review`, "info");
                }
            }
        }
        catch (error) {
            console_1.logger.error("CRON", "Spot custody recovery passes failed", error);
            (0, broadcast_1.broadcastLog)(cronName, `Spot custody recovery failed: ${error.message}`, "error");
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
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const transactions = await db_1.models.transaction.findAll({
            where: {
                status: "PENDING",
                type,
                createdAt: {
                    [sequelize_1.Op.between]: [sevenDaysAgo, new Date()],
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
                    where: { type: "SPOT" },
                    required: true,
                    attributes: ["id", "currency", "type"],
                },
            ],
            order: [["createdAt", "ASC"]],
            limit: 100,
        });
        return transactions;
    }
    catch (error) {
        console_1.logger.error("CRON", "Error getting pending spot transactions", error);
        throw error;
    }
}
async function verifyAgedSpotDeposit(cronName, transaction) {
    var _a, _b, _c;
    const currency = (_a = transaction.wallet) === null || _a === void 0 ? void 0 : _a.currency;
    if (!currency) {
        (0, broadcast_1.broadcastLog)(cronName, `Deposit ${transaction.id} has no wallet currency; skipping direct verification`, "error");
        return false;
    }
    if (((_b = transaction.wallet) === null || _b === void 0 ? void 0 : _b.type) !== "SPOT") {
        (0, broadcast_1.broadcastLog)(cronName, `Deposit ${transaction.id} is not on a SPOT wallet; refusing direct verification`, "error");
        return false;
    }
    const exchange = await exchange_1.default.startExchange();
    if (!exchange) {
        (0, broadcast_1.broadcastLog)(cronName, `Exchange unavailable; skipping direct verification for deposit ${transaction.id}`, "info");
        return false;
    }
    const since = new Date(transaction.createdAt).getTime() - 60 * 60 * 1000;
    let deposits = [];
    if (exchange.has["fetchDeposits"]) {
        deposits = await exchange.fetchDeposits(currency, since);
    }
    else if (exchange.has["fetchTransactions"]) {
        deposits = await exchange.fetchTransactions();
    }
    else {
        (0, broadcast_1.broadcastLog)(cronName, `Exchange does not support deposit lookups; skipping deposit ${transaction.id}`, "info");
        return false;
    }
    const referenceId = transaction.referenceId;
    const matchesReference = (txid) => {
        if (!txid)
            return false;
        if (txid === referenceId)
            return true;
        const offChain = txid.match(/off-?chain transfer\s+(\w+)/i);
        return !!offChain && offChain[1] === referenceId;
    };
    const deposit = deposits.find((d) => matchesReference(d === null || d === void 0 ? void 0 : d.txid));
    if (!deposit) {
        (0, broadcast_1.broadcastLog)(cronName, `Deposit ${transaction.id} not found on exchange yet; will retry on next run`, "info");
        return false;
    }
    const { refuseIfSettlement } = require("@b/utils/pool-backing/guard");
    const refuse = async (settlementReason) => {
        await (0, utils_1.releaseDepositReference)(transaction.id, "FAILED", settlementReason);
        console_1.logger.warn("CRON", `Refusing to credit aged deposit ${transaction.id} (${referenceId}): ${settlementReason}`);
        (0, broadcast_1.broadcastLog)(cronName, `Deposit ${transaction.id} refused: ${settlementReason}; marked FAILED and its reference released`, "error");
    };
    const txidReason = await refuseIfSettlement({ txid: deposit.txid });
    if (txidReason) {
        await refuse(txidReason);
        return false;
    }
    if (deposit.status !== "ok") {
        (0, broadcast_1.broadcastLog)(cronName, `Deposit ${transaction.id} found with status ${deposit.status}; waiting for confirmation`, "info");
        return false;
    }
    const senderReason = await refuseIfSettlement({
        txid: deposit.txid,
        addressFrom: deposit.addressFrom,
        claimantUserId: transaction.userId,
    });
    if (senderReason) {
        await refuse(senderReason);
        return false;
    }
    if (!require("@b/utils/exchange-funding").matchesDepositCurrency(currency, deposit)) {
        (0, broadcast_1.broadcastLog)(cronName, `Deposit ${transaction.id} currency mismatch (wallet=${currency}, deposit=${deposit.currency}); skipping`, "error");
        return false;
    }
    const amount = Number(deposit.amount);
    const rawFee = Number((_c = deposit.fee) === null || _c === void 0 ? void 0 : _c.cost) || 0;
    if (!isFinite(amount) || amount <= 0) {
        (0, broadcast_1.broadcastLog)(cronName, `Deposit ${transaction.id} has an invalid amount on the exchange; skipping`, "error");
        return false;
    }
    const fee = Math.min(Math.max(rawFee, 0), amount);
    if (!(amount - fee > 0)) {
        await (0, utils_2.updateTransaction)(transaction.id, {
            status: "FAILED",
            amount,
            fee,
            description: `Deposit of ${amount} ${currency} nets nothing after the ${rawFee} network fee charged by the exchange.`,
        });
        (0, broadcast_1.broadcastLog)(cronName, `Deposit ${transaction.id} nets nothing after a ${rawFee} ${currency} exchange fee; marked FAILED`, "error");
        return false;
    }
    const rowMetadata = (0, utils_2.parseTransactionMetadata)(transaction.metadata);
    const depositExpiration = await cache_1.CacheManager.getInstance().getSettingBool("depositExpiration", false);
    if (depositExpiration && !(rowMetadata === null || rowMetadata === void 0 ? void 0 : rowMetadata.spotSweepIntentId)) {
        const depositAtSec = Number(deposit.timestamp) / 1000;
        const requestedAtSec = new Date(transaction.createdAt).getTime() / 1000;
        const ageMinutes = (Date.now() / 1000 - depositAtSec) / 60;
        if (isFinite(depositAtSec) &&
            (depositAtSec < requestedAtSec - 900 ||
                depositAtSec > requestedAtSec + 900 ||
                ageMinutes > 45)) {
            await (0, utils_2.updateTransaction)(transaction.id, {
                status: "TIMEOUT",
                description: "Deposit expired. Please try again.",
                amount,
            });
            (0, broadcast_1.broadcastLog)(cronName, `Deposit ${transaction.id} expired under depositExpiration; marked TIMEOUT`, "info");
            return false;
        }
    }
    const { gateDepositAgainstIntent, applyIntentHold } = require("@b/utils/spot-deposit/matcher");
    const gate = await gateDepositAgainstIntent({ metadata: rowMetadata, deposit });
    if (gate.action === "hold") {
        const held = await applyIntentHold({
            transactionId: transaction.id,
            userId: transaction.userId ? String(transaction.userId) : null,
            metadata: rowMetadata,
            outcome: gate,
            currency,
            deposit,
        });
        (0, broadcast_1.broadcastLog)(cronName, held
            ? `Deposit ${transaction.id} held for review (${gate.review}); left PENDING for the admin door`
            : `Deposit ${transaction.id} is already held for review (${gate.review})`, "info");
        return false;
    }
    const credited = await db_1.sequelize.transaction(async (t) => {
        const row = await db_1.models.transaction.findByPk(transaction.id, {
            transaction: t,
            lock: t.LOCK.UPDATE,
        });
        if (!row || row.status !== "PENDING")
            return false;
        try {
            await (0, spot_1.updateSpotWalletBalance)(transaction.userId, currency, amount, fee, "DEPOSIT", undefined, `spot_deposit_ws_${transaction.id}`, t);
        }
        catch (error) {
            if ((error === null || error === void 0 ? void 0 : error.code) !== "DUPLICATE_OPERATION")
                throw error;
        }
        const [updated] = await db_1.models.transaction.update({
            status: "COMPLETED",
            description: `Deposit of ${amount} ${currency} to wallet`,
            amount,
            fee,
        }, { where: { id: transaction.id, status: "PENDING" }, transaction: t });
        return updated > 0;
    });
    if (!credited)
        return false;
    if (gate.intentId) {
        try {
            const { markCredited } = require("@b/utils/spot-deposit/intents");
            await markCredited(gate.intentId, {
                spotTransactionId: String(transaction.id),
                matchedDepositId: transaction.referenceId ? String(transaction.referenceId) : undefined,
                metadata: { creditedAt: new Date().toISOString(), creditedAmount: amount },
                broadcast: { message: `Your deposit of ${amount} ${currency} has been credited`, amount },
            });
        }
        catch (error) {
            console_1.logger.error("CRON", `Intent ${gate.intentId} not marked CREDITED for deposit ${transaction.id}: ${(error === null || error === void 0 ? void 0 : error.message) || error}`);
        }
    }
    try {
        const provider = await exchange_1.default.getProvider();
        if (provider === "kucoin") {
            await exchange.transfer(currency, deposit.amount, "main", "trade");
        }
    }
    catch (transferError) {
        console_1.logger.error("CRON", `KuCoin main->trade transfer failed for deposit ${transaction.id}`, transferError);
    }
    try {
        await (0, notifications_1.createNotification)({
            userId: transaction.userId,
            relatedId: transaction.id,
            type: "system",
            title: "Deposit Confirmation",
            message: `Your deposit of ${amount} ${currency} has been confirmed.`,
            link: `/finance/wallet/deposit/${transaction.id}`,
            actions: [
                {
                    label: "View Deposit",
                    link: `/finance/wallet/deposit/${transaction.id}`,
                    primary: true,
                },
            ],
        });
    }
    catch (notifError) {
        console_1.logger.error("CRON", `Failed to create deposit notification for ${transaction.id}`, notifError);
    }
    try {
        await (0, affiliate_1.processFirstDepositRewards)(transaction.userId, amount, currency, transaction.id);
    }
    catch (rewardError) {
        console_1.logger.error("CRON", `Failed processing welcome bonus for deposit ${transaction.id}`, rewardError);
    }
    (0, broadcast_1.broadcastLog)(cronName, `Aged deposit ${transaction.id} verified directly and credited`, "success");
    return true;
}
async function refundAndFinalizeWithdrawal(transaction, userId, currency, newStatus, expectedStatus) {
    return db_1.sequelize.transaction(async (t) => {
        const row = await db_1.models.transaction.findByPk(transaction.id, {
            transaction: t,
            lock: t.LOCK.UPDATE,
        });
        if (!row || row.status !== expectedStatus) {
            return false;
        }
        if (row.trxId) {
            console_1.logger.error("CRON", `Refusing to refund withdrawal ${transaction.id}: trxId ${row.trxId} shows the payout was already broadcast`);
            return false;
        }
        try {
            await (0, spot_1.updateSpotWalletBalance)(userId, currency, Number(transaction.amount), Number(transaction.fee), "REFUND_WITHDRAWAL", undefined, `spot_refund_withdrawal_${transaction.id}`, t);
        }
        catch (error) {
            if ((error === null || error === void 0 ? void 0 : error.code) !== "DUPLICATE_OPERATION")
                throw error;
        }
        const [updated] = await db_1.models.transaction.update({ status: newStatus }, {
            where: { id: transaction.id, status: expectedStatus },
            transaction: t,
        });
        if (updated > 0 && transaction.referenceId) {
            const feeAmount = (0, refund_safety_1.resolveSettlementFee)(transaction);
            if (feeAmount > 0) {
                await (0, fees_1.recordPlatformLoss)({
                    currency,
                    walletType: "SPOT",
                    lossAmount: feeAmount,
                    type: "WITHDRAW",
                    description: `Reversal of the platform fee on ${newStatus.toLowerCase()} withdrawal ${transaction.id}`,
                    referenceId: `${transaction.id}_fee_reversal`,
                    transaction: t,
                });
            }
        }
        return updated > 0;
    });
}
function findDispatchCandidates(withdrawals, transaction, windowStartMs) {
    const metadata = (0, utils_2.parseTransactionMetadata)(transaction.metadata);
    const toAddress = typeof metadata.toAddress === "string" && metadata.toAddress.length > 0
        ? metadata.toAddress
        : undefined;
    const expectedAmounts = [
        metadata.netAmount,
        metadata.totalAmount,
        transaction.amount,
    ]
        .map((value) => Number(value))
        .filter((value) => isFinite(value) && value > 0);
    return withdrawals.filter((w) => {
        if ((w === null || w === void 0 ? void 0 : w.timestamp) && w.timestamp < windowStartMs)
            return false;
        const address = typeof (w === null || w === void 0 ? void 0 : w.address) === "string" && w.address.length > 0
            ? w.address
            : undefined;
        if (toAddress && address && address.toLowerCase() === toAddress.toLowerCase()) {
            return true;
        }
        const amount = Number(w === null || w === void 0 ? void 0 : w.amount);
        if (!isFinite(amount) || amount <= 0)
            return true;
        return expectedAmounts.some((expected) => Math.abs(amount - expected) <= Math.max(expected * 0.02, 1e-8));
    });
}
const REVIEW_BACKOFF_BASE_MS = 60 * 60 * 1000;
const REVIEW_BACKOFF_MAX_MS = 24 * 60 * 60 * 1000;
async function flagWithdrawalForReview(cronName, transaction, currency, reason) {
    var _a;
    const message = `Withdrawal ${transaction.id} (${Number(transaction.amount)} ${currency}, user ${transaction.userId}) requires manual review: ${reason}`;
    console_1.logger.error("CRON", `MANUAL REVIEW REQUIRED: ${message}`);
    (0, broadcast_1.broadcastLog)(cronName, `MANUAL REVIEW REQUIRED: ${message}`, "error");
    try {
        const adminUsers = await db_1.models.user.findAll({
            include: [
                { model: db_1.models.role, as: "role", where: { name: "Super Admin" } },
            ],
            limit: 1,
        });
        if (adminUsers.length > 0) {
            await notification_1.notificationService.send({
                userId: adminUsers[0].id,
                type: "SYSTEM",
                channels: ["IN_APP"],
                idempotencyKey: `spot_withdrawal_review_${transaction.id}`,
                data: {
                    title: "Withdrawal Requires Manual Review",
                    message,
                    details: JSON.stringify({
                        transactionId: transaction.id,
                        currency,
                        reason,
                    }),
                },
                priority: "HIGH",
            });
        }
    }
    catch (notifyError) {
        console_1.logger.error("CRON", `Failed to notify admin about withdrawal ${transaction.id}`, notifyError);
    }
    try {
        const metadata = (0, utils_2.parseTransactionMetadata)(transaction.metadata);
        const reviewCount = Number((_a = metadata.reconcileReviewCount) !== null && _a !== void 0 ? _a : 0) + 1;
        const backoffMs = Math.min(REVIEW_BACKOFF_BASE_MS * 2 ** (reviewCount - 1), REVIEW_BACKOFF_MAX_MS);
        await db_1.models.transaction.update({
            metadata: JSON.stringify({
                ...metadata,
                reconcileReviewCount: reviewCount,
                reconcileNextCheckAt: new Date(Date.now() + backoffMs).toISOString(),
            }),
        }, { where: { id: transaction.id } });
    }
    catch (backoffError) {
        console_1.logger.error("CRON", `Failed to record review backoff for withdrawal ${transaction.id}`, backoffError);
    }
}
async function reconcileSpotWithdrawals() {
    const cronName = "reconcileSpotWithdrawals";
    const MIN_AGE_MS = 5 * 60 * 1000;
    const STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000;
    const EVIDENCE_SCAN_LOOKBACK_MS = 60 * 60 * 1000;
    const EVIDENCE_SCAN_LIMIT = 1000;
    const BATCH_LIMIT = 200;
    const MAX_SCAN = BATCH_LIMIT * 10;
    try {
        (0, broadcast_1.broadcastStatus)(cronName, "running");
        (0, broadcast_1.broadcastLog)(cronName, "Starting reconciliation of PROCESSING withdrawals");
        const now = Date.now();
        const actionable = [];
        let scanned = 0;
        let offset = 0;
        let inBackoff = 0;
        while (actionable.length < BATCH_LIMIT && scanned < MAX_SCAN) {
            const page = await db_1.models.transaction.findAll({
                where: {
                    status: "PROCESSING",
                    type: "WITHDRAW",
                    createdAt: { [sequelize_1.Op.lt]: new Date(now - MIN_AGE_MS) },
                },
                include: [
                    {
                        model: db_1.models.wallet,
                        as: "wallet",
                        where: { type: "SPOT" },
                        required: true,
                        attributes: ["id", "currency", "type"],
                    },
                ],
                order: [["createdAt", "ASC"]],
                limit: BATCH_LIMIT,
                offset,
            });
            if (!page.length)
                break;
            scanned += page.length;
            offset += page.length;
            for (const row of page) {
                const { reconcileNextCheckAt } = (0, utils_2.parseTransactionMetadata)(row.metadata);
                if (reconcileNextCheckAt && new Date(reconcileNextCheckAt).getTime() > now) {
                    inBackoff++;
                    continue;
                }
                actionable.push(row);
                if (actionable.length >= BATCH_LIMIT)
                    break;
            }
            if (page.length < BATCH_LIMIT)
                break;
        }
        const transactions = actionable;
        (0, broadcast_1.broadcastLog)(cronName, `Found ${transactions.length} PROCESSING withdrawal transactions to reconcile` +
            (inBackoff ? ` (${inBackoff} in review backoff, skipped)` : "") +
            (scanned >= MAX_SCAN
                ? `; scan cap ${MAX_SCAN} reached — more rows remain for the next run`
                : ""));
        const exchange = await exchange_1.default.startExchange();
        if (!exchange) {
            (0, broadcast_1.broadcastLog)(cronName, "Exchange unavailable; skipping reconciliation run", "info");
            (0, broadcast_1.broadcastStatus)(cronName, "completed");
            return;
        }
        const activeProvider = await exchange_1.default.getProvider();
        const withdrawalScanCache = new Map();
        const fetchWithdrawalsCached = async (currency, since, limit) => {
            const key = `${currency}|${since !== null && since !== void 0 ? since : ""}|${limit !== null && limit !== void 0 ? limit : ""}`;
            if (withdrawalScanCache.has(key))
                return withdrawalScanCache.get(key);
            const result = await exchange.fetchWithdrawals(currency, since, limit);
            withdrawalScanCache.set(key, result);
            return result;
        };
        for (const transaction of transactions) {
            const userId = transaction.userId;
            const rowMetadata = (0, utils_2.parseTransactionMetadata)(transaction.metadata);
            if (rowMetadata.provider && rowMetadata.provider !== activeProvider) {
                await flagWithdrawalForReview(cronName, transaction, transaction.wallet?.currency, "Withdrawal belongs to a different exchange provider; refusing cross-provider reconciliation");
                continue;
            }
            const providerWithdrawId = rowMetadata.providerWithdrawId !== undefined &&
                rowMetadata.providerWithdrawId !== null &&
                String(rowMetadata.providerWithdrawId).length > 0
                ? String(rowMetadata.providerWithdrawId)
                : null;
            const trx = transaction.referenceId || providerWithdrawId;
            const dispatchedButUnconfirmed = rowMetadata.dispatchedButUnconfirmed === true;
            const { wallet } = transaction;
            const ageMs = now - new Date(transaction.createdAt).getTime();
            try {
                if (!(wallet === null || wallet === void 0 ? void 0 : wallet.currency)) {
                    (0, broadcast_1.broadcastLog)(cronName, `Transaction ${transaction.id} has no wallet currency; skipping`, "error");
                    continue;
                }
                if (trx) {
                    const withdrawals = await fetchWithdrawalsCached(wallet.currency);
                    const withdrawData = (withdrawals !== null && withdrawals !== void 0 ? withdrawals : []).find((w) => String(w.id) === String(trx));
                    if (withdrawData) {
                        const withdrawStatus = (0, exchange_status_1.normalizeExchangeWithdrawStatus)(withdrawData.status);
                        if (withdrawStatus === "FAILED" ||
                            withdrawStatus === "CANCELLED") {
                            const finalized = await refundAndFinalizeWithdrawal(transaction, userId, wallet.currency, withdrawStatus, "PROCESSING");
                            if (finalized) {
                                (0, broadcast_1.broadcastLog)(cronName, `Transaction ${transaction.id} reconciled to ${withdrawStatus} and refunded`, "success");
                                await (0, notifications_1.createNotification)({
                                    userId,
                                    relatedId: transaction.id,
                                    title: "Withdrawal Failed",
                                    message: `Your withdrawal of ${Number(transaction.amount)} ${wallet.currency} has failed.`,
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
                            }
                        }
                        else {
                            const updates = {};
                            if (withdrawStatus !== transaction.status) {
                                updates.status = withdrawStatus;
                                updates.referenceId = trx;
                            }
                            if (!transaction.referenceId) {
                                updates.referenceId = trx;
                            }
                            if (!transaction.trxId) {
                                const onChainHash = (0, tx_hash_1.extractExchangeTxHash)(withdrawData);
                                if (onChainHash)
                                    updates.trxId = onChainHash;
                            }
                            if (Object.keys(updates).length) {
                                await (0, utils_2.updateTransaction)(transaction.id, updates);
                                (0, broadcast_1.broadcastLog)(cronName, updates.status
                                    ? `Transaction ${transaction.id} reconciled to ${withdrawStatus}` +
                                        (updates.trxId ? ` with on-chain hash ${updates.trxId}` : "")
                                    : `Transaction ${transaction.id} recorded on-chain hash ${updates.trxId}`, "success");
                            }
                        }
                        continue;
                    }
                    if (ageMs >= STALE_THRESHOLD_MS) {
                        await flagWithdrawalForReview(cronName, transaction, wallet.currency, "referenceId is set (payout was dispatched) but the exchange's fetchWithdrawals page does not contain it; refusing to auto-refund");
                    }
                    else {
                        (0, broadcast_1.broadcastLog)(cronName, `Transaction ${transaction.id} not yet found on exchange; will retry on next run`, "info");
                    }
                    continue;
                }
                if (dispatchedButUnconfirmed) {
                    if (ageMs >= STALE_THRESHOLD_MS) {
                        await flagWithdrawalForReview(cronName, transaction, wallet.currency, "the route recorded that the exchange accepted this payout but no withdrawal id was captured; refusing to auto-refund — match it against the exchange's withdrawal history by hand");
                    }
                    else {
                        (0, broadcast_1.broadcastLog)(cronName, `Transaction ${transaction.id} was dispatched without a captured withdrawal id; will retry on next run`, "info");
                    }
                    continue;
                }
                if (ageMs < STALE_THRESHOLD_MS) {
                    (0, broadcast_1.broadcastLog)(cronName, `Transaction ${transaction.id} has no referenceId yet; will retry on next run`, "info");
                    continue;
                }
                const createdAtMs = new Date(transaction.createdAt).getTime();
                const scanSinceMs = createdAtMs - EVIDENCE_SCAN_LOOKBACK_MS;
                let scannedWithdrawals;
                try {
                    scannedWithdrawals = await fetchWithdrawalsCached(wallet.currency, scanSinceMs, EVIDENCE_SCAN_LIMIT);
                }
                catch (scanError) {
                    await flagWithdrawalForReview(cronName, transaction, wallet.currency, `evidence scan failed (${scanError.message}); refusing to auto-refund without proof the payout was never sent`);
                    continue;
                }
                if (!Array.isArray(scannedWithdrawals)) {
                    await flagWithdrawalForReview(cronName, transaction, wallet.currency, "evidence scan returned no usable data; refusing to auto-refund");
                    continue;
                }
                const candidates = findDispatchCandidates(scannedWithdrawals, transaction, scanSinceMs);
                if (candidates.length > 0) {
                    await flagWithdrawalForReview(cronName, transaction, wallet.currency, `${candidates.length} exchange withdrawal(s) match this row's currency/amount/address in its timeframe; the payout may have been sent`);
                    continue;
                }
                const refunded = await refundAndFinalizeWithdrawal(transaction, userId, wallet.currency, "FAILED", "PROCESSING");
                if (refunded) {
                    await (0, notifications_1.createNotification)({
                        userId,
                        relatedId: transaction.id,
                        title: "Withdrawal Failed",
                        message: `Your withdrawal of ${Number(transaction.amount)} ${wallet.currency} could not be confirmed and has been refunded.`,
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
                    (0, broadcast_1.broadcastLog)(cronName, `Stale withdrawal ${transaction.id} (no referenceId, clean evidence scan) marked FAILED and refunded`, "info");
                }
            }
            catch (error) {
                console_1.logger.error("CRON", `Error reconciling withdrawal ${transaction.id}`, error);
                (0, broadcast_1.broadcastLog)(cronName, `Error reconciling withdrawal ${transaction.id}: ${error.message}`, "error");
                continue;
            }
        }
        (0, broadcast_1.broadcastStatus)(cronName, "completed");
        (0, broadcast_1.broadcastLog)(cronName, "Reconciliation of PROCESSING withdrawals completed", "success");
    }
    catch (error) {
        console_1.logger.error("CRON", "Reconciliation of PROCESSING withdrawals failed", error);
        (0, broadcast_1.broadcastStatus)(cronName, "failed");
        (0, broadcast_1.broadcastLog)(cronName, `Reconciliation of PROCESSING withdrawals failed: ${error.message}`, "error");
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
        const exchange = await exchange_1.default.startExchange();
        if (!exchange) {
            (0, broadcast_1.broadcastLog)(cronName, "Exchange unavailable; skipping pending withdrawal run", "info");
            (0, broadcast_1.broadcastStatus)(cronName, "completed");
            return;
        }
        for (const transaction of transactions) {
            (0, broadcast_1.broadcastLog)(cronName, `Processing withdrawal transaction ${transaction.id}`);
            const userId = transaction.userId;
            const trx = transaction.referenceId;
            if (!trx) {
                (0, broadcast_1.broadcastLog)(cronName, `Transaction ${transaction.id} has no referenceId; skipping`, "info");
                continue;
            }
            try {
                const { wallet } = transaction;
                (0, broadcast_1.broadcastLog)(cronName, `Fetching withdrawals for currency ${wallet === null || wallet === void 0 ? void 0 : wallet.currency} for transaction ${transaction.id}`);
                const withdrawals = await exchange.fetchWithdrawals(wallet === null || wallet === void 0 ? void 0 : wallet.currency);
                const withdrawData = withdrawals.find((w) => String(w.id) === String(trx));
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
                if (withdrawStatus === "FAILED" || withdrawStatus === "CANCELLED") {
                    const finalized = await refundAndFinalizeWithdrawal(transaction, userId, wallet === null || wallet === void 0 ? void 0 : wallet.currency, withdrawStatus, "PENDING");
                    if (!finalized) {
                        (0, broadcast_1.broadcastLog)(cronName, `Transaction ${transaction.id} already finalized elsewhere; skipping`, "info");
                        continue;
                    }
                    (0, broadcast_1.broadcastLog)(cronName, `Transaction ${transaction.id} status updated to ${withdrawStatus} and refunded`, "success");
                    await (0, notifications_1.createNotification)({
                        userId,
                        relatedId: transaction.id,
                        title: "Withdrawal Failed",
                        message: `Your withdrawal of ${Number(transaction.amount)} ${wallet === null || wallet === void 0 ? void 0 : wallet.currency} has failed.`,
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
                else {
                    await (0, utils_2.updateTransaction)(transaction.id, { status: withdrawStatus });
                    (0, broadcast_1.broadcastLog)(cronName, `Transaction ${transaction.id} status updated to ${withdrawStatus}`, "success");
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
