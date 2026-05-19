"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyPendingTransactions = verifyPendingTransactions;
const deposit_1 = require("@b/api/(ext)/ecosystem/utils/redis/deposit");
const wallet_1 = require("@b/api/(ext)/ecosystem/utils/wallet");
const Websocket_1 = require("@b/handler/Websocket");
const utxo_1 = require("@b/api/(ext)/ecosystem/utils/utxo");
const notifications_1 = require("@b/utils/notifications");
const utils_1 = require("../../wallet/utils");
const ProviderManager_1 = require("./ProviderManager");
const console_1 = require("@b/utils/console");
const verificationAttempts = new Map();
const MAX_VERIFICATION_ATTEMPTS = 5;
const VERIFICATION_ATTEMPT_RESET_TIME = 30 * 60 * 1000;
async function verifyPendingTransactions() {
    if (!(0, Websocket_1.hasClients)(`/api/ecosystem/deposit`)) {
        return;
    }
    const processingTransactions = new Set();
    const processingStats = {
        total: 0,
        processed: 0,
        failed: 0,
        skipped: 0,
    };
    try {
        const pendingTransactions = await (0, deposit_1.loadFromRedis)("pendingTransactions");
        if (!pendingTransactions || Object.keys(pendingTransactions).length === 0) {
            return;
        }
        const txHashes = Object.keys(pendingTransactions);
        processingStats.total = txHashes.length;
        console_1.logger.info("DEPOSIT", `Starting verification of ${txHashes.length} pending transactions`);
        const concurrency = 5;
        const chunks = [];
        for (let i = 0; i < txHashes.length; i += concurrency) {
            chunks.push(txHashes.slice(i, i + concurrency));
        }
        for (const chunk of chunks) {
            const verificationPromises = chunk.map(async (txHash) => {
                var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
                if (processingTransactions.has(txHash)) {
                    console_1.logger.debug("DEPOSIT", `Transaction ${txHash} already being processed, skipping`);
                    processingStats.skipped++;
                    return;
                }
                try {
                    const txDetails = pendingTransactions[txHash];
                    if (!txDetails) {
                        console_1.logger.error("DEPOSIT", `Transaction ${txHash} not found in pending list`);
                        processingStats.failed++;
                        return;
                    }
                    const attemptKey = `${txHash}:${txDetails.chain}`;
                    const attempts = verificationAttempts.get(attemptKey) || 0;
                    if (attempts >= MAX_VERIFICATION_ATTEMPTS) {
                        console_1.logger.warn("DEPOSIT", `Max verification attempts reached for ${txHash}, removing from pending`);
                        delete pendingTransactions[txHash];
                        verificationAttempts.delete(attemptKey);
                        await (0, deposit_1.offloadToRedis)("pendingTransactions", pendingTransactions);
                        processingStats.failed++;
                        return;
                    }
                    processingTransactions.add(txHash);
                    const chain = txDetails.chain;
                    let isConfirmed = false;
                    let updatedTxDetails = null;
                    if (["SOL", "TRON", "XMR", "TON"].includes(chain)) {
                        isConfirmed =
                            txDetails.status === "COMPLETED" ||
                                txDetails.status === "CONFIRMED";
                        updatedTxDetails = txDetails;
                        if (isConfirmed) {
                            console_1.logger.success("DEPOSIT", `${chain} transaction ${txHash} already confirmed`);
                        }
                    }
                    else if (["BTC", "LTC", "DOGE", "DASH"].includes(chain)) {
                        try {
                            const data = await (0, utxo_1.verifyUTXOTransaction)(chain, txHash);
                            isConfirmed = data.confirmed;
                            updatedTxDetails = {
                                ...txDetails,
                                status: isConfirmed ? "COMPLETED" : "PENDING",
                                fee: data.fee || 0,
                            };
                            if (isConfirmed) {
                                console_1.logger.success("DEPOSIT", `UTXO transaction ${txHash} confirmed`);
                            }
                            else {
                                console_1.logger.debug("DEPOSIT", `UTXO transaction ${txHash} still pending confirmation`);
                            }
                        }
                        catch (error) {
                            console_1.logger.error("DEPOSIT", `UTXO verification failed for ${txHash}: ${error.message}`);
                            verificationAttempts.set(attemptKey, attempts + 1);
                            processingStats.failed++;
                            return;
                        }
                    }
                    else {
                        let provider = ProviderManager_1.chainProviders.get(chain);
                        if (!provider) {
                            provider = await (0, ProviderManager_1.initializeWebSocketProvider)(chain);
                            if (!provider) {
                                provider = await (0, ProviderManager_1.initializeHttpProvider)(chain);
                            }
                        }
                        if (!provider) {
                            console_1.logger.error("DEPOSIT", `Provider not available for chain ${chain}`);
                            verificationAttempts.set(attemptKey, attempts + 1);
                            processingStats.failed++;
                            return;
                        }
                        try {
                            const receipt = await provider.getTransactionReceipt(txHash);
                            if (!receipt) {
                                console_1.logger.debug("DEPOSIT", `Transaction ${txHash} on ${chain} not yet confirmed`);
                                verificationAttempts.set(attemptKey, attempts + 1);
                                return;
                            }
                            isConfirmed = receipt.status === 1;
                            updatedTxDetails = {
                                ...txDetails,
                                gasUsed: ((_a = receipt.gasUsed) === null || _a === void 0 ? void 0 : _a.toString()) || "0",
                                effectiveGasPrice: ((_b = receipt.effectiveGasPrice) === null || _b === void 0 ? void 0 : _b.toString()) ||
                                    txDetails.gasPrice ||
                                    "0",
                                blockNumber: ((_c = receipt.blockNumber) === null || _c === void 0 ? void 0 : _c.toString()) || "0",
                                status: isConfirmed ? "COMPLETED" : "FAILED",
                            };
                            if (isConfirmed) {
                                console_1.logger.success("DEPOSIT", `EVM transaction ${txHash} on ${chain} confirmed in block ${receipt.blockNumber}`);
                            }
                            else {
                                console_1.logger.warn("DEPOSIT", `EVM transaction ${txHash} on ${chain} failed`);
                            }
                        }
                        catch (error) {
                            console_1.logger.error("DEPOSIT", `Error fetching receipt for ${txHash} on ${chain}: ${error.message}`);
                            verificationAttempts.set(attemptKey, attempts + 1);
                            processingStats.failed++;
                            return;
                        }
                    }
                    if (isConfirmed && updatedTxDetails) {
                        try {
                            console_1.logger.info("DEPOSIT", `Processing confirmed transaction ${txHash} for deposit handling`);
                            const response = await (0, wallet_1.handleEcosystemDeposit)(updatedTxDetails);
                            if (!response.transactionId) {
                                console_1.logger.info("DEPOSIT", `Transaction ${txHash} already processed or invalid, removing from pending`);
                                delete pendingTransactions[txHash];
                                verificationAttempts.delete(attemptKey);
                                await (0, deposit_1.offloadToRedis)("pendingTransactions", pendingTransactions);
                                processingStats.skipped++;
                                return;
                            }
                            const address = chain === "MO"
                                ? (_d = txDetails.to) === null || _d === void 0 ? void 0 : _d.toLowerCase()
                                : typeof txDetails.to === "string"
                                    ? txDetails.to
                                    : (_e = txDetails.address) === null || _e === void 0 ? void 0 : _e.toLowerCase();
                            try {
                                Websocket_1.messageBroker.broadcastToSubscribedClients("/api/ecosystem/deposit", {
                                    currency: (_f = response.wallet) === null || _f === void 0 ? void 0 : _f.currency,
                                    chain,
                                    address,
                                }, {
                                    stream: "verification",
                                    data: {
                                        status: 200,
                                        message: "Transaction completed",
                                        ...response,
                                        trx: updatedTxDetails,
                                        balance: (_g = response.wallet) === null || _g === void 0 ? void 0 : _g.balance,
                                        currency: (_h = response.wallet) === null || _h === void 0 ? void 0 : _h.currency,
                                        chain,
                                        method: "Wallet Deposit",
                                    },
                                });
                                console_1.logger.success("DEPOSIT", `WebSocket broadcast sent for transaction ${txHash}`);
                            }
                            catch (broadcastError) {
                                console_1.logger.error("DEPOSIT", `WebSocket broadcast failed for ${txHash}: ${broadcastError.message}`);
                            }
                            if (txDetails.contractType === "NO_PERMIT" && txDetails.to) {
                                try {
                                    await (0, utils_1.unlockAddress)(txDetails.to);
                                    console_1.logger.success("DEPOSIT", `Address ${txDetails.to} unlocked for NO_PERMIT transaction ${txHash}`);
                                }
                                catch (unlockError) {
                                    console_1.logger.error("DEPOSIT", `Failed to unlock address ${txDetails.to}: ${unlockError.message}`);
                                }
                            }
                            if ((_j = response.wallet) === null || _j === void 0 ? void 0 : _j.userId) {
                                try {
                                    await (0, notifications_1.createNotification)({
                                        userId: response.wallet.userId,
                                        relatedId: response.transactionId,
                                        title: "Deposit Confirmation",
                                        message: `Your deposit of ${updatedTxDetails.amount} ${response.wallet.currency} has been confirmed.`,
                                        type: "system",
                                        link: `/finance/history`,
                                        actions: [
                                            {
                                                label: "View Deposit",
                                                link: `/finance/history`,
                                                primary: true,
                                            },
                                        ],
                                    });
                                    console_1.logger.success("DEPOSIT", `Notification created for user ${response.wallet.userId}`);
                                }
                                catch (notificationError) {
                                    console_1.logger.error("DEPOSIT", `Failed to create notification: ${notificationError.message}`);
                                }
                            }
                            delete pendingTransactions[txHash];
                            verificationAttempts.delete(attemptKey);
                            await (0, deposit_1.offloadToRedis)("pendingTransactions", pendingTransactions);
                            processingStats.processed++;
                            console_1.logger.success("DEPOSIT", `Transaction ${txHash} fully processed and removed from pending`);
                        }
                        catch (error) {
                            console_1.logger.error("DEPOSIT", `Error handling deposit for ${txHash}: ${error.message}`);
                            if (error.message.includes("already processed")) {
                                delete pendingTransactions[txHash];
                                verificationAttempts.delete(attemptKey);
                                await (0, deposit_1.offloadToRedis)("pendingTransactions", pendingTransactions);
                                processingStats.skipped++;
                            }
                            else {
                                verificationAttempts.set(attemptKey, attempts + 1);
                                processingStats.failed++;
                            }
                        }
                    }
                    else {
                        verificationAttempts.set(attemptKey, attempts + 1);
                    }
                }
                catch (error) {
                    console_1.logger.error("DEPOSIT", `Error verifying transaction ${txHash}: ${error.message}`);
                    const attemptKey = `${txHash}:${((_k = pendingTransactions[txHash]) === null || _k === void 0 ? void 0 : _k.chain) || "unknown"}`;
                    const attempts = verificationAttempts.get(attemptKey) || 0;
                    verificationAttempts.set(attemptKey, attempts + 1);
                    processingStats.failed++;
                }
                finally {
                    processingTransactions.delete(txHash);
                }
            });
            await Promise.all(verificationPromises);
        }
        console_1.logger.info("DEPOSIT", `Verification completed - Total: ${processingStats.total}, Processed: ${processingStats.processed}, Failed: ${processingStats.failed}, Skipped: ${processingStats.skipped}`);
    }
    catch (error) {
        console_1.logger.error("DEPOSIT", `Error in verifyPendingTransactions: ${error.message}`);
    }
    finally {
        cleanupVerificationAttempts();
    }
}
function cleanupVerificationAttempts() {
    const now = Date.now();
    const cutoffTime = now - VERIFICATION_ATTEMPT_RESET_TIME;
    for (const [key, timestamp] of verificationAttempts.entries()) {
        if (timestamp < cutoffTime) {
            verificationAttempts.delete(key);
        }
    }
}
