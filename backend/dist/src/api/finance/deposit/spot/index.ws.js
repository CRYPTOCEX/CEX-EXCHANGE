"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.spotVerificationIntervals = exports.metadata = void 0;
exports.startSpotVerificationSchedule = startSpotVerificationSchedule;
exports.stopVerificationSchedule = stopVerificationSchedule;
exports.verifyTransaction = verifyTransaction;
exports.getTransactionQuery = getTransactionQuery;
exports.deleteTransaction = deleteTransaction;
const sequelize_1 = require("sequelize");
const exchange_1 = __importDefault(require("@b/utils/exchange"));
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
const utils_3 = require("./utils");
const path = "/api/finance/deposit/spot";
exports.metadata = {};
exports.spotVerificationIntervals = new Map();
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
        return sendMessage(message.payload, {
            status: 404,
            message: "Transaction not found",
        });
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
    setTimeout(() => {
        stopVerificationSchedule(transactionId);
    }, 1800000);
}
function stopVerificationSchedule(transactionId) {
    const interval = exports.spotVerificationIntervals.get(transactionId);
    if (interval) {
        clearInterval(interval);
        exports.spotVerificationIntervals.delete(transactionId);
    }
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
            console_1.logger.debug("SPOT_DEPOSIT", "Exchange credentials verified successfully");
        }
        catch (error) {
            console_1.logger.error("SPOT_DEPOSIT", `Error testing exchange credentials: ${error.message}`);
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
        console_1.logger.debug("SPOT_DEPOSIT", `Found deposit with status: ${deposit.status}, amount: ${deposit.amount}`);
        if (deposit.status !== "ok") {
            console_1.logger.debug("SPOT_DEPOSIT", `Deposit status is not 'ok': ${deposit.status}`);
            return;
        }
        const amount = deposit.amount;
        const fee = ((_a = deposit.fee) === null || _a === void 0 ? void 0 : _a.cost) || 0;
        console_1.logger.debug("SPOT_DEPOSIT", `Processing deposit: amount=${amount}, fee=${fee}, currency=${deposit.currency || wallet.currency}`);
        if (["kucoin", "binance", "okx", "xt"].includes(provider) &&
            wallet.currency !== deposit.currency) {
            console_1.logger.error("SPOT_DEPOSIT", `Currency mismatch: wallet=${wallet.currency}, deposit=${deposit.currency}`);
            sendMessage(payload, {
                status: 400,
                message: "Invalid deposit currency",
            });
            stopVerificationSchedule(transaction.id);
            await deleteTransaction(transaction.id);
            return;
        }
        const cacheManager = cache_1.CacheManager.getInstance();
        const settings = await cacheManager.getSettings();
        if (settings.has("depositExpiration") &&
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
        console_1.logger.debug("SPOT_DEPOSIT", `Updating transaction ${transaction.id} to COMPLETED`);
        const updatedTransaction = await (0, utils_2.updateTransaction)(transaction.id, {
            status: "COMPLETED",
            description: `Deposit of ${amount} ${wallet.currency} to wallet`,
            amount: amount,
            fee: fee,
        });
        console_1.logger.debug("SPOT_DEPOSIT", `Updating wallet balance for user ${userId}`);
        const updatedWallet = (await (0, spot_1.updateSpotWalletBalance)(userId, wallet.currency, amount, fee, "DEPOSIT"));
        if (!updatedWallet) {
            console_1.logger.error("SPOT_DEPOSIT", "Failed to update wallet balance");
            sendMessage(payload, {
                status: 500,
                message: "Failed to update wallet balance",
            });
            stopVerificationSchedule(updatedTransaction.id);
            return;
        }
        if (provider === "kucoin") {
            try {
                await exchange.transfer(wallet.currency, deposit.amount, "main", "trade");
                console_1.logger.debug("SPOT_DEPOSIT", "Completed KuCoin transfer from main to trade account");
            }
            catch (error) {
                console_1.logger.error("SPOT_DEPOSIT", `Transfer failed: ${error.message}`);
            }
        }
        const userData = await (0, utils_1.getUserById)(userId);
        try {
            await (0, emails_1.sendSpotWalletDepositConfirmationEmail)(userData, updatedTransaction, updatedWallet, metadata.chain);
            await (0, notifications_1.createNotification)({
                userId: userId,
                relatedId: updatedTransaction.id,
                type: "system",
                title: "Deposit Confirmation",
                message: `Your deposit of ${amount} ${wallet.currency} has been confirmed.`,
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
            await (0, affiliate_1.processRewards)(userData.id, amount, "WELCOME_BONUS", wallet.currency, `WELCOME_BONUS:deposit:${updatedTransaction.id}`);
            console_1.logger.debug("SPOT_DEPOSIT", "Processed welcome bonus rewards");
        }
        catch (error) {
            console_1.logger.error("SPOT_DEPOSIT", `Error processing rewards: ${error.message}`);
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
        stopVerificationSchedule(updatedTransaction.id);
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
async function deleteTransaction(id) {
    await db_1.models.transaction.destroy({
        where: { id },
    });
}
