"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.spotIntentMatchIntervals = exports.spotVerificationIntervals = exports.metadata = void 0;
exports.authorizeSubscription = authorizeSubscription;
exports.startSpotVerificationSchedule = startSpotVerificationSchedule;
exports.stopVerificationSchedule = stopVerificationSchedule;
exports.startSpotIntentSchedule = startSpotIntentSchedule;
exports.startSpotCurrencyMatchSchedule = startSpotCurrencyMatchSchedule;
exports.stopSpotIntentSchedule = stopSpotIntentSchedule;
exports.creditSpotDepositRow = creditSpotDepositRow;
exports.verifyTransaction = verifyTransaction;
exports.getTransactionQuery = getTransactionQuery;
const sequelize_1 = require("sequelize");
const exchange_1 = __importDefault(require("@b/utils/exchange"));
const funding = require("@b/utils/exchange-funding");
const Websocket_1 = require("@b/handler/Websocket");
const error_1 = require("@b/utils/error");
const affiliate_1 = require("@b/utils/affiliate");
const utils_1 = require("@b/api/user/profile/utils");
const emails_1 = require("@b/utils/emails");
const db_1 = require("@b/db");
const utils_2 = require("../../utils");
const notifications_1 = require("@b/utils/notifications");
const cache_1 = require("@b/utils/cache");
const console_1 = require("@b/utils/console");
const spot_1 = require("@b/utils/spot");
const rust_owns_1 = require("@b/utils/rust-owns");
const utils_3 = require("./utils");
const path = "/api/finance/deposit/spot";
exports.metadata = {
    requiresAuth: true,
};
async function authorizeSubscription(ws, message) {
    var _a, _b;
    let parsed = message;
    if (typeof parsed === "string") {
        try {
            parsed = JSON.parse(parsed);
        }
        catch (_c) {
            return { allowed: false, message: "Subscription check failed" };
        }
    }
    const payload = parsed === null || parsed === void 0 ? void 0 : parsed.payload;
    if ((parsed === null || parsed === void 0 ? void 0 : parsed.action) !== "SUBSCRIBE" || !payload || !payload.trx) {
        return { allowed: true };
    }
    const userId = (_a = ws === null || ws === void 0 ? void 0 : ws.user) === null || _a === void 0 ? void 0 : _a.id;
    if (!userId || ((_b = ws === null || ws === void 0 ? void 0 : ws.user) === null || _b === void 0 ? void 0 : _b.role) === "guest") {
        return { allowed: false, message: "Authentication required" };
    }
    const trx = String(payload.trx);
    try {
        const row = await db_1.models.transaction.findOne({
            where: { referenceId: trx, userId, type: "DEPOSIT" },
            attributes: ["id"],
        });
        if (!row) {
            console_1.logger.warn("SPOT_DEPOSIT", `Denied verification subscription: user ${userId} does not own deposit ${trx}`);
            return { allowed: false, message: "Unauthorized access to this deposit" };
        }
        return { allowed: true };
    }
    catch (error) {
        console_1.logger.error("SPOT_DEPOSIT", `Verification subscription check failed for ${trx}: ${(error === null || error === void 0 ? void 0 : error.message) || error}`);
        return { allowed: false, message: "Subscription check failed" };
    }
}
exports.spotVerificationIntervals = new Map();
const spotVerificationStops = new Map();
let credOkProvider = "";
let credOkUntil = 0;
exports.default = async (data, message) => {
    const { user } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id))
        throw (0, error_1.createError)(401, "Unauthorized");
    if (typeof message === "string") {
        message = JSON.parse(message);
    }
    const { trx } = message.payload;
    const transaction = (await db_1.models.transaction.findOne({
        where: { referenceId: trx, userId: user.id, type: "DEPOSIT" },
    }));
    if (!transaction) {
        return {
            stream: "verification",
            data: { status: 404, message: "Transaction not found" },
        };
    }
    startSpotVerificationSchedule(transaction.id, user.id, trx);
};
const sendMessage = (payload, data) => {
    try {
        Websocket_1.messageBroker.broadcastToSubscribedClients(path, payload, {
            stream: "verification",
            data: data,
        });
    }
    catch (error) {
        console_1.logger.error("SPOT_DEPOSIT", `Failed to send message: ${error}`);
    }
};
function startSpotVerificationSchedule(transactionId, userId, trx) {
    if ((0, rust_owns_1.rustOwns)("spot.deposit.pollers"))
        return;
    const payload = {
        trx,
    };
    const existingInterval = exports.spotVerificationIntervals.get(transactionId);
    if (existingInterval) {
        clearInterval(existingInterval);
    }
    const interval = setInterval(async () => {
        try {
            await verifyTransaction(userId, trx, payload);
        }
        catch (error) {
            console_1.logger.error("SPOT_DEPOSIT", `Error verifying transaction: ${error.message}`);
            stopVerificationSchedule(transactionId);
        }
    }, 15000);
    exports.spotVerificationIntervals.set(transactionId, interval);
    const existingStop = spotVerificationStops.get(transactionId);
    if (existingStop)
        clearTimeout(existingStop);
    spotVerificationStops.set(transactionId, setTimeout(() => {
        spotVerificationStops.delete(transactionId);
        stopVerificationSchedule(transactionId);
    }, 1800000));
}
function stopVerificationSchedule(transactionId) {
    const interval = exports.spotVerificationIntervals.get(transactionId);
    if (interval) {
        clearInterval(interval);
        exports.spotVerificationIntervals.delete(transactionId);
    }
    const stop = spotVerificationStops.get(transactionId);
    if (stop) {
        clearTimeout(stop);
        spotVerificationStops.delete(transactionId);
    }
}
exports.spotIntentMatchIntervals = new Map();
const SPOT_INTENT_MATCH_INTERVAL_MS = 15000;
const SPOT_INTENT_MATCH_MAX_MS = 60 * 60 * 1000 + SPOT_INTENT_MATCH_INTERVAL_MS;
async function startSpotIntentSchedule(intentId) {
    var _a;
    let intent = null;
    try {
        intent = await db_1.models.spotDepositIntent.findOne({ where: { id: intentId } });
    }
    catch (error) {
        console_1.logger.error("SPOT_DEPOSIT", `Intent ${intentId} could not be read for scheduling: ${(error === null || error === void 0 ? void 0 : error.message) || error}`);
        return null;
    }
    if (!intent)
        return null;
    if (String(intent.mode) !== "amount_match" || String(intent.status) !== "OPEN")
        return null;
    const currency = String((_a = intent.currency) !== null && _a !== void 0 ? _a : "").trim().toUpperCase();
    if (!currency)
        return null;
    startSpotCurrencyMatchSchedule(currency);
    return currency;
}
function startSpotCurrencyMatchSchedule(currency) {
    if ((0, rust_owns_1.rustOwns)("spot.deposit.pollers"))
        return;
    const key = String(currency !== null && currency !== void 0 ? currency : "").trim().toUpperCase();
    if (!key || exports.spotIntentMatchIntervals.has(key))
        return;
    const interval = setInterval(async () => {
        try {
            const { matchOpenIntents } = require("@b/utils/spot-deposit/matcher");
            const outcome = await matchOpenIntents({ currency: key });
            if (outcome.skipped === "no open intents")
                stopSpotIntentSchedule(key);
        }
        catch (error) {
            console_1.logger.error("SPOT_DEPOSIT", `Amount matching for ${key} failed: ${(error === null || error === void 0 ? void 0 : error.message) || error}`);
        }
    }, SPOT_INTENT_MATCH_INTERVAL_MS);
    if (typeof interval.unref === "function")
        interval.unref();
    exports.spotIntentMatchIntervals.set(key, interval);
    console_1.logger.debug("SPOT_DEPOSIT", `Amount matching started for ${key}`);
    const stop = setTimeout(() => stopSpotIntentSchedule(key), SPOT_INTENT_MATCH_MAX_MS);
    if (typeof stop.unref === "function")
        stop.unref();
}
function stopSpotIntentSchedule(currency) {
    const key = String(currency !== null && currency !== void 0 ? currency : "").trim().toUpperCase();
    const interval = exports.spotIntentMatchIntervals.get(key);
    if (interval) {
        clearInterval(interval);
        exports.spotIntentMatchIntervals.delete(key);
    }
}
async function creditSpotDepositRow(params) {
    var _a, _b;
    const { transactionId, userId, currency, amount, fee } = params;
    let lockedStatus = null;
    const updatedWallet = (await db_1.sequelize.transaction(async (t) => {
        var _a;
        const lockedRow = await db_1.models.transaction.findByPk(transactionId, {
            transaction: t,
            lock: t.LOCK.UPDATE,
        });
        if (!lockedRow || lockedRow.status !== "PENDING") {
            lockedStatus = (_a = lockedRow === null || lockedRow === void 0 ? void 0 : lockedRow.status) !== null && _a !== void 0 ? _a : "MISSING";
            return null;
        }
        const wallet_ = (await (0, spot_1.updateSpotWalletBalance)(userId, currency, amount, fee, "DEPOSIT", undefined, `spot_deposit_ws_${transactionId}`, t));
        const [flipped] = await db_1.models.transaction.update({
            status: "COMPLETED",
            description: `Deposit of ${amount} ${currency} to wallet`,
            amount: amount,
            fee: fee,
        }, { where: { id: transactionId, status: "PENDING" }, transaction: t });
        if (flipped === 0) {
            throw new Error(`Deposit ${transactionId} left PENDING while it was being credited; credit rolled back`);
        }
        return wallet_;
    }));
    if (updatedWallet === null) {
        return { credited: false, lockedStatus, wallet: null, transaction: null };
    }
    const updatedTransaction = await (0, utils_2.updateTransaction)(transactionId, {
        status: "COMPLETED",
        description: `Deposit of ${amount} ${currency} to wallet`,
        amount: amount,
        fee: fee,
    });
    if (params.provider === "kucoin" && params.exchange) {
        try {
            await params.exchange.transfer(currency, (_a = params.depositAmount) !== null && _a !== void 0 ? _a : amount, "main", "trade");
            console_1.logger.debug("SPOT_DEPOSIT", "Completed KuCoin transfer from main to trade account");
        }
        catch (error) {
            console_1.logger.error("SPOT_DEPOSIT", `Transfer failed: ${error.message}`);
        }
    }
    let userData = null;
    try {
        userData = await (0, utils_1.getUserById)(userId);
        await (0, emails_1.sendSpotWalletDepositConfirmationEmail)(userData, updatedTransaction, updatedWallet, params.chain);
        await (0, notifications_1.createNotification)({
            userId: userId,
            relatedId: updatedTransaction.id,
            type: "system",
            title: "Deposit Confirmation",
            message: `Your deposit of ${amount} ${currency} has been confirmed.`,
            link: `/finance/wallet/deposit/${updatedTransaction.id}`,
            actions: [
                {
                    label: "View Deposit",
                    link: `/finance/wallet/deposit/${updatedTransaction.id}`,
                    primary: true,
                },
            ],
        });
        console_1.logger.debug("SPOT_DEPOSIT", "Sent confirmation email and notification");
    }
    catch (error) {
        console_1.logger.error("SPOT_DEPOSIT", `Deposit confirmation email failed: ${error.message}`);
    }
    try {
        await (0, affiliate_1.processFirstDepositRewards)((_b = userData === null || userData === void 0 ? void 0 : userData.id) !== null && _b !== void 0 ? _b : userId, amount, currency, updatedTransaction.id);
        console_1.logger.debug("SPOT_DEPOSIT", "Processed first-deposit rewards");
    }
    catch (error) {
        console_1.logger.error("SPOT_DEPOSIT", `Error processing rewards: ${error.message}`);
    }
    return { credited: true, lockedStatus: null, wallet: updatedWallet, transaction: updatedTransaction };
}
function isValidJSON(str) {
    try {
        JSON.parse(str);
        return true;
    }
    catch (e) {
        return false;
    }
}
function unescapeString(str) {
    return str.replace(/\\"/g, '"').replace(/\\\\/g, "\\");
}
async function verifyTransaction(userId, trx, payload) {
    var _a;
    var _b;
    console_1.logger.debug("SPOT_DEPOSIT", `Starting verification for transaction ${trx} (User: ${userId})`);
    try {
        const transaction = await getTransactionQuery(userId, trx);
        if (!transaction) {
            console_1.logger.error("SPOT_DEPOSIT", `Transaction not found for trx: ${trx}, userId: ${userId}`);
            throw (0, error_1.createError)({ statusCode: 404, message: "Transaction not found" });
        }
        const wallet = await db_1.models.wallet.findByPk(transaction.walletId);
        if (!wallet) {
            console_1.logger.error("SPOT_DEPOSIT", `Wallet not found for transaction ${transaction.id}`);
            throw (0, error_1.createError)({ statusCode: 404, message: "Wallet not found" });
        }
        console_1.logger.debug("SPOT_DEPOSIT", `Processing transaction ${transaction.id} for currency ${wallet.currency}`);
        const { metadata, xtChain } = (0, utils_3.parseMetadataAndMapChainToXt)(transaction.metadata);
        console_1.logger.debug("SPOT_DEPOSIT", `Chain: ${metadata.chain}, XT mapped chain: ${xtChain}`);
        if (transaction.status === "COMPLETED") {
            console_1.logger.debug("SPOT_DEPOSIT", `Transaction ${transaction.id} already completed`);
            sendMessage(payload, {
                status: 201,
                message: "Transaction already completed",
                transaction,
                balance: wallet.balance,
                currency: wallet.currency,
                chain: metadata.chain,
                method: "Wallet Transfer",
            });
            stopVerificationSchedule(transaction.id);
            return;
        }
        console_1.logger.debug("SPOT_DEPOSIT", "Initializing exchange connection...");
        const exchange = await exchange_1.default.startExchange();
        if (!exchange) {
            console_1.logger.error("SPOT_DEPOSIT", "Exchange instance not available - this could indicate missing exchange configuration");
            const activeProvider = await db_1.models.exchange.findOne({
                where: { status: true }
            });
            if (!activeProvider) {
                console_1.logger.error("SPOT_DEPOSIT", "No active exchange provider found in database");
                sendMessage(payload, {
                    status: 500,
                    message: "No exchange provider configured. Please configure an exchange provider in the admin panel.",
                });
                stopVerificationSchedule(transaction.id);
                return;
            }
            console_1.logger.error("SPOT_DEPOSIT", `Exchange provider '${activeProvider.name}' is configured but connection failed`);
            sendMessage(payload, {
                status: 500,
                message: `Exchange connection failed. Please check ${activeProvider.name} API credentials.`,
            });
            stopVerificationSchedule(transaction.id);
            return;
        }
        const provider = await exchange_1.default.getProvider();
        if (!provider) {
            console_1.logger.error("SPOT_DEPOSIT", "Provider name not available");
            sendMessage(payload, {
                status: 500,
                message: "Exchange provider not available",
            });
            stopVerificationSchedule(transaction.id);
            return;
        }
        console_1.logger.debug("SPOT_DEPOSIT", `Using exchange provider: ${provider}`);
        if (credOkProvider !== provider || Date.now() > credOkUntil) {
            try {
                const credentialsTest = await exchange_1.default.testExchangeCredentials(provider);
                if (!credentialsTest.status) {
                    console_1.logger.error("SPOT_DEPOSIT", `Exchange credentials test failed: ${credentialsTest.message}`);
                    sendMessage(payload, {
                        status: 500,
                        message: `Exchange credentials invalid: ${credentialsTest.message}`,
                    });
                    stopVerificationSchedule(transaction.id);
                    return;
                }
                credOkProvider = provider;
                credOkUntil = Date.now() + 300000;
                console_1.logger.debug("SPOT_DEPOSIT", "Exchange credentials verified successfully");
            }
            catch (error) {
                console_1.logger.error("SPOT_DEPOSIT", `Error testing exchange credentials: ${error.message}`);
            }
        }
        console_1.logger.debug("SPOT_DEPOSIT", `Fetching deposits for currency ${wallet.currency}...`);
        let deposits = [];
        try {
            if (exchange.has["fetchDeposits"]) {
                const params = {};
                if (xtChain && provider === "xt") {
                    params.chain = xtChain;
                    console_1.logger.debug("SPOT_DEPOSIT", `Using XT chain parameter: ${xtChain}`);
                }
                else if (provider === "kucoin" && metadata.chain) {
                    const kucoinChainMap = {
                        'TRC20': 'TRX',
                        'ERC20': 'ETH',
                        'BEP20': 'BSC',
                        'POLYGON': 'MATIC',
                        'ARBITRUM': 'ARBITRUM',
                        'OPTIMISM': 'OPTIMISM'
                    };
                    const kucoinChain = kucoinChainMap[metadata.chain] || metadata.chain;
                    params.chain = kucoinChain;
                    console_1.logger.debug("SPOT_DEPOSIT", `Using KuCoin chain parameter: ${kucoinChain} (original: ${metadata.chain})`);
                }
                if (provider === "kucoin") {
                    console_1.logger.debug("SPOT_DEPOSIT", "KuCoin Debug - Testing different parameter combinations...");
                    console_1.logger.debug("SPOT_DEPOSIT", "KuCoin Try #1: With chain='TRX' parameter");
                    deposits = await exchange.fetchDeposits(wallet.currency, undefined, undefined, params);
                    console_1.logger.debug("SPOT_DEPOSIT", `KuCoin Try #1 Result: ${deposits.length} deposits`);
                    if (deposits.length === 0) {
                        console_1.logger.debug("SPOT_DEPOSIT", "KuCoin Try #2: Without chain parameter");
                        const depositsNoChain = await exchange.fetchDeposits(wallet.currency);
                        console_1.logger.debug("SPOT_DEPOSIT", `KuCoin Try #2 Result: ${depositsNoChain.length} deposits`);
                        if (depositsNoChain.length > 0) {
                            deposits = depositsNoChain;
                            console_1.logger.debug("SPOT_DEPOSIT", "KuCoin: Using results from Try #2 (no chain parameter)");
                        }
                    }
                    if (deposits.length === 0) {
                        console_1.logger.debug("SPOT_DEPOSIT", "KuCoin Try #3: Fetching ALL deposits (no currency filter)");
                        try {
                            const allDeposits = await exchange.fetchDeposits();
                            console_1.logger.debug("SPOT_DEPOSIT", `KuCoin Try #3 Result: ${allDeposits.length} total deposits`);
                            if (allDeposits.length > 0) {
                                const trxDeposits = allDeposits.filter(d => d.currency === 'TRX');
                                console_1.logger.debug("SPOT_DEPOSIT", `KuCoin Try #3: Found ${trxDeposits.length} TRX deposits out of ${allDeposits.length} total`);
                                if (trxDeposits.length > 0) {
                                    deposits = trxDeposits;
                                    console_1.logger.debug("SPOT_DEPOSIT", "KuCoin: Using filtered TRX deposits");
                                }
                            }
                        }
                        catch (allDepositsError) {
                            console_1.logger.error("SPOT_DEPOSIT", `KuCoin Try #3 Error: ${allDepositsError.message}`);
                        }
                    }
                }
                else {
                    deposits = await exchange.fetchDeposits(wallet.currency, undefined, undefined, params);
                }
                console_1.logger.debug("SPOT_DEPOSIT", `Found ${deposits.length} deposits using fetchDeposits`);
                if (deposits.length > 0) {
                    console_1.logger.debug("SPOT_DEPOSIT", `Sample: ${deposits.slice(0, 3).map(d => `${d.currency}:${d.amount}`).join(', ')}`);
                }
                else {
                    console_1.logger.debug("SPOT_DEPOSIT", "No deposits found - deposit may not have arrived yet");
                }
            }
            else if (exchange.has["fetchTransactions"]) {
                deposits = await exchange.fetchTransactions();
                console_1.logger.debug("SPOT_DEPOSIT", `Found ${deposits.length} transactions using fetchTransactions`);
            }
            else {
                console_1.logger.error("SPOT_DEPOSIT", `Exchange ${provider} does not support fetchDeposits or fetchTransactions`);
                sendMessage(payload, {
                    status: 500,
                    message: `Exchange ${provider} does not support deposit verification`,
                });
                stopVerificationSchedule(transaction.id);
                return;
            }
        }
        catch (error) {
            console_1.logger.error("SPOT_DEPOSIT", `Error fetching deposits or transactions: ${error.message}`);
            credOkUntil = 0;
            if (error.name === 'AuthenticationError' || error.name === 'PermissionDenied') {
                sendMessage(payload, {
                    status: 500,
                    message: `Exchange authentication failed: ${error.message}`,
                });
                stopVerificationSchedule(transaction.id);
                return;
            }
            return;
        }
        console_1.logger.debug("SPOT_DEPOSIT", `Searching for transaction ${trx} in ${deposits.length} deposits...`);
        let deposit;
        if (provider === "binance") {
            deposit = deposits.find((d) => {
                const parsedTxid = parseBinanceTxid(d.txid);
                const matches = parsedTxid === transaction.referenceId;
                if (matches) {
                    console_1.logger.debug("SPOT_DEPOSIT", `Found matching Binance deposit: ${d.txid}`);
                }
                return matches;
            });
        }
        else {
            deposit = deposits.find((d) => {
                const matches = d.txid === transaction.referenceId;
                if (matches) {
                    console_1.logger.debug("SPOT_DEPOSIT", `Found matching deposit: ${d.txid}`);
                }
                return matches;
            });
        }
        if (!deposit) {
            console_1.logger.debug("SPOT_DEPOSIT", `Transaction ${trx} not found in exchange deposits yet`);
            return;
        }
        const { refuseIfSettlement } = require("@b/utils/pool-backing/guard");
        const refuse = async (settlementReason) => {
            console_1.logger.warn("SPOT_DEPOSIT", `Refusing to credit deposit ${transaction.id} (${trx}): ${settlementReason}`);
            stopVerificationSchedule(transaction.id);
            await (0, utils_3.releaseDepositReference)(transaction.id, "FAILED", settlementReason);
            sendMessage(payload, {
                status: 409,
                message: settlementReason,
            });
        };
        const txidReason = await refuseIfSettlement({ txid: deposit.txid });
        if (txidReason) {
            await refuse(txidReason);
            return;
        }
        console_1.logger.debug("SPOT_DEPOSIT", `Found deposit with status: ${deposit.status}, amount: ${deposit.amount}`);
        if (deposit.status !== "ok") {
            console_1.logger.debug("SPOT_DEPOSIT", `Deposit status is not 'ok': ${deposit.status}`);
            return;
        }
        const senderReason = await refuseIfSettlement({
            txid: deposit.txid,
            addressFrom: deposit.addressFrom,
            claimantUserId: transaction.userId,
        });
        if (senderReason) {
            await refuse(senderReason);
            return;
        }
        const amount = Number(deposit.amount) || 0;
        const rawFee = Number((_a = deposit.fee) === null || _a === void 0 ? void 0 : _a.cost) || 0;
        const fee = Math.min(Math.max(rawFee, 0), amount);
        console_1.logger.debug("SPOT_DEPOSIT", `Processing deposit: amount=${amount}, fee=${fee}, currency=${deposit.currency || wallet.currency}`);
        if (!(amount > 0) || !(amount - fee > 0)) {
            console_1.logger.warn("SPOT_DEPOSIT", `Deposit ${trx} nets to ${amount - fee} ${wallet.currency} after a ${rawFee} exchange fee; marking it FAILED instead of retrying forever`);
            stopVerificationSchedule(transaction.id);
            await (0, utils_2.updateTransaction)(transaction.id, {
                status: "FAILED",
                amount,
                fee,
                description: `Deposit of ${amount} ${wallet.currency} nets nothing after the ${rawFee} network fee charged by the exchange.`,
            });
            sendMessage(payload, {
                status: 400,
                message: "Deposit amount does not cover the network fee",
            });
            return;
        }
        if (!funding.matchesDepositCurrency(wallet.currency, deposit)) {
            console_1.logger.error("SPOT_DEPOSIT", `Currency mismatch: wallet=${wallet.currency}, deposit=${deposit.currency}`);
            sendMessage(payload, {
                status: 400,
                message: "Invalid deposit currency",
            });
            stopVerificationSchedule(transaction.id);
            await (0, utils_3.releaseDepositReference)(transaction.id, "FAILED", `Deposit ${trx} is ${deposit.currency} on the exchange, not ${wallet.currency}. Submit it again under the correct currency.`);
            return;
        }
        const cacheManager = cache_1.CacheManager.getInstance();
        const settings = await cacheManager.getSettings();
        if (!(metadata === null || metadata === void 0 ? void 0 : metadata.spotSweepIntentId) &&
            settings.has("depositExpiration") &&
            settings.get("depositExpiration") === "true") {
            const createdAt = deposit.timestamp / 1000;
            const transactionCreatedAt = transaction.createdAt
                ? new Date(transaction.createdAt).getTime() / 1000
                : 0;
            const currentTime = Date.now() / 1000;
            const timeDiff = (currentTime - createdAt) / 60;
            if (createdAt < transactionCreatedAt - 900 ||
                createdAt > transactionCreatedAt + 900 ||
                timeDiff > 45) {
                console_1.logger.warn("SPOT_DEPOSIT", `Deposit expired: timeDiff=${timeDiff.toFixed(1)} minutes`);
                sendMessage(payload, {
                    status: 400,
                    message: "Deposit expired",
                });
                stopVerificationSchedule(transaction.id);
                await (0, utils_2.updateTransaction)(transaction.id, {
                    status: "TIMEOUT",
                    description: "Deposit expired. Please try again.",
                    amount: amount,
                });
                return;
            }
        }
        function parseBinanceTxid(txid) {
            const offChainTransferPatterns = [
                /off-?chain transfer\s+(\w+)/i,
                /офчейн\s+перевод\s+(\w+)/i,
                /transferência\s+off-chain\s+(\w+)/i,
                /transferencia\s+off-chain\s+(\w+)/i,
            ];
            for (const pattern of offChainTransferPatterns) {
                const match = txid.match(pattern);
                if (match && match[1]) {
                    return match[1];
                }
            }
            return txid;
        }
        const { gateDepositAgainstIntent, applyIntentHold } = require("@b/utils/spot-deposit/matcher");
        const gate = await gateDepositAgainstIntent({ metadata, deposit });
        const intentId = gate.intentId;
        if (gate.action === "hold") {
            const held = await applyIntentHold({
                transactionId: transaction.id,
                userId: (_b = transaction.userId) !== null && _b !== void 0 ? _b : userId,
                metadata,
                outcome: gate,
                currency: wallet.currency,
                deposit,
            });
            if (!held) {
                console_1.logger.debug("SPOT_DEPOSIT", `Deposit ${transaction.id} was already held for review; not notifying again`);
            }
            stopVerificationSchedule(transaction.id);
            sendMessage(payload, {
                status: 202,
                message: gate.message || "Your deposit is being reviewed by our team",
                review: gate.review,
                transaction,
                currency: wallet.currency,
                chain: metadata.chain,
            });
            return;
        }
        console_1.logger.debug("SPOT_DEPOSIT", `Crediting wallet and completing transaction ${transaction.id}`);
        let credit;
        try {
            credit = await creditSpotDepositRow({
                transactionId: transaction.id,
                userId,
                currency: wallet.currency,
                amount,
                fee,
                chain: metadata.chain,
                exchange,
                provider,
                depositAmount: Number(deposit.amount),
            });
        }
        catch (error) {
            console_1.logger.error("SPOT_DEPOSIT", `Failed to credit wallet / complete transaction: ${error.message}`);
            sendMessage(payload, {
                status: 500,
                message: "Failed to update wallet balance",
            });
            return;
        }
        const updatedWallet = credit.wallet;
        const lockedStatus = credit.lockedStatus;
        if (!credit.credited) {
            console_1.logger.warn("SPOT_DEPOSIT", `Deposit ${transaction.id} is no longer PENDING (status=${lockedStatus}); not crediting`);
            sendMessage(payload, {
                status: 409,
                message: `Deposit is no longer pending (status: ${lockedStatus})`,
            });
            stopVerificationSchedule(transaction.id);
            return;
        }
        if (!updatedWallet) {
            console_1.logger.error("SPOT_DEPOSIT", "Failed to update wallet balance");
            sendMessage(payload, {
                status: 500,
                message: "Failed to update wallet balance",
            });
            stopVerificationSchedule(transaction.id);
            return;
        }
        const updatedTransaction = credit.transaction;
        if (intentId) {
            try {
                const { markCredited } = require("@b/utils/spot-deposit/intents");
                await markCredited(intentId, {
                    spotTransactionId: transaction.id,
                    matchedDepositId: transaction.referenceId ? String(transaction.referenceId) : undefined,
                    metadata: { creditedAt: new Date().toISOString(), creditedAmount: amount },
                    broadcast: {
                        message: `Your deposit of ${amount} ${wallet.currency} has been credited`,
                        amount,
                        transaction: updatedTransaction,
                    },
                });
            }
            catch (error) {
                console_1.logger.error("SPOT_DEPOSIT", `Intent ${intentId} not marked CREDITED: ${(error === null || error === void 0 ? void 0 : error.message) || error}`);
            }
        }
        console_1.logger.success("SPOT_DEPOSIT", `Successfully completed deposit ${trx} for user ${userId}`);
        sendMessage(payload, {
            status: 200,
            message: "Transaction completed",
            transaction: updatedTransaction,
            balance: updatedWallet.balance,
            currency: updatedWallet.currency,
            chain: metadata.chain,
            method: "Wallet Transfer",
        });
        stopVerificationSchedule(transaction.id);
    }
    catch (error) {
        console_1.logger.error("SPOT_DEPOSIT", `Error in verifyTransaction: ${error.message}`);
        sendMessage(payload, {
            status: 500,
            message: `Verification error: ${error.message}`,
        });
        throw error;
    }
}
function normalizeTransactionReference(reference) {
    const lowerCaseReference = reference.toLowerCase().trim();
    const offChainPatterns = [
        "off-chain transfer",
        "offchain transfer",
        "transferencia fuera de cadena",
    ];
    for (const pattern of offChainPatterns) {
        if (lowerCaseReference.includes(pattern)) {
            return "off-chain transfer";
        }
    }
    return reference;
}
async function getTransactionQuery(userId, trx) {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    const transaction = await db_1.models.transaction.findOne({
        where: {
            referenceId: trx,
            userId: userId,
            type: "DEPOSIT",
            createdAt: { [sequelize_1.Op.gte]: thirtyMinutesAgo },
        },
        include: [
            {
                model: db_1.models.wallet,
                as: "wallet",
                attributes: ["id", "currency"],
            },
            {
                model: db_1.models.user,
                as: "user",
                attributes: ["id", "firstName", "lastName", "email", "avatar"],
            },
        ],
    });
    if (!transaction) {
        throw (0, error_1.createError)({ statusCode: 404, message: "Transaction not found" });
    }
    return transaction.get({ plain: true });
}
