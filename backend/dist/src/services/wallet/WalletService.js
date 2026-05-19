"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.walletService = exports.WalletService = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const sequelize_1 = require("sequelize");
const fees_1 = require("@b/utils/fees");
const errors_1 = require("./errors");
const precision_1 = require("./utils/precision");
const AuditLogger_1 = require("./audit/AuditLogger");
const PrecisionCacheService_1 = require("./PrecisionCacheService");
class WalletService {
    constructor() {
        this.auditLogger = new AuditLogger_1.AuditLogger();
    }
    static getInstance() {
        if (!WalletService.instance) {
            WalletService.instance = new WalletService();
        }
        return WalletService.instance;
    }
    async getWallet(userId, type, currency, options) {
        const { transaction, lock = false, createIfMissing = false } = options || {};
        const queryOptions = {
            where: { userId, type, currency },
        };
        if (transaction) {
            queryOptions.transaction = transaction;
            if (lock) {
                queryOptions.lock = sequelize_1.Transaction.LOCK.UPDATE;
            }
        }
        let wallet = await db_1.models.wallet.findOne(queryOptions);
        if (!wallet && createIfMissing) {
            wallet = await this.createBasicWallet(userId, type, currency, transaction);
        }
        if (!wallet) {
            throw new errors_1.WalletNotFoundError(`${userId}/${type}/${currency}`);
        }
        return this.toWalletAttributes(wallet);
    }
    async getWalletById(walletId, options) {
        const { transaction, lock = false } = options || {};
        const queryOptions = {
            where: { id: walletId },
        };
        if (transaction) {
            queryOptions.transaction = transaction;
            if (lock) {
                queryOptions.lock = sequelize_1.Transaction.LOCK.UPDATE;
            }
        }
        const wallet = await db_1.models.wallet.findOne(queryOptions);
        if (!wallet) {
            throw new errors_1.WalletNotFoundError(walletId);
        }
        return this.toWalletAttributes(wallet);
    }
    async getWalletSafe(userId, type, currency, options) {
        try {
            return await this.getWallet(userId, type, currency, options);
        }
        catch (error) {
            if (error instanceof errors_1.WalletNotFoundError) {
                return null;
            }
            throw error;
        }
    }
    async createBasicWallet(userId, type, currency, transaction) {
        return await db_1.models.wallet.create({
            userId,
            type,
            currency,
            balance: 0,
            inOrder: 0,
            status: true,
        }, transaction ? { transaction } : undefined);
    }
    toWalletAttributes(wallet) {
        var _a, _b;
        const plain = wallet.get ? wallet.get({ plain: true }) : wallet;
        return {
            ...plain,
            balance: parseFloat(((_a = plain.balance) === null || _a === void 0 ? void 0 : _a.toString()) || "0"),
            inOrder: parseFloat(((_b = plain.inOrder) === null || _b === void 0 ? void 0 : _b.toString()) || "0"),
        };
    }
    async checkIdempotency(idempotencyKey, transaction) {
        const existing = await db_1.models.transaction.findOne({
            where: {
                [sequelize_1.Op.or]: [
                    { id: idempotencyKey },
                    {
                        metadata: {
                            [sequelize_1.Op.like]: `%"idempotencyKey":"${idempotencyKey}"%`,
                        },
                    },
                ],
            },
            attributes: ["id"],
            ...(transaction && { transaction }),
        });
        if (existing) {
            return { isDuplicate: true, existingTransactionId: existing.id };
        }
        return { isDuplicate: false };
    }
    validateAmount(amount, operation) {
        if (amount <= 0) {
            throw new errors_1.InvalidAmountError(amount, `${operation} amount must be positive`);
        }
        if (!isFinite(amount)) {
            throw new errors_1.InvalidAmountError(amount, "Amount must be a finite number");
        }
    }
    validateWalletStatus(wallet) {
        if (!wallet.status) {
            throw new errors_1.WalletDisabledError(wallet.id);
        }
    }
    mapOperationTypeToTransactionType(operationType) {
        const mapping = {
            DEPOSIT: "DEPOSIT",
            WITHDRAW: "WITHDRAW",
            INCOMING_TRANSFER: "INCOMING_TRANSFER",
            OUTGOING_TRANSFER: "OUTGOING_TRANSFER",
            PAYMENT: "PAYMENT",
            REFUND: "REFUND",
            BINARY_ORDER: "BINARY_ORDER",
            EXCHANGE_ORDER: "EXCHANGE_ORDER",
            INVESTMENT: "INVESTMENT",
            INVESTMENT_ROI: "INVESTMENT_ROI",
            AI_INVESTMENT: "AI_INVESTMENT",
            AI_INVESTMENT_ROI: "AI_INVESTMENT_ROI",
            INVOICE: "INVOICE",
            FOREX_DEPOSIT: "FOREX_DEPOSIT",
            FOREX_WITHDRAW: "FOREX_WITHDRAW",
            FOREX_INVESTMENT: "FOREX_INVESTMENT",
            FOREX_INVESTMENT_ROI: "FOREX_INVESTMENT_ROI",
            ICO_CONTRIBUTION: "ICO_CONTRIBUTION",
            REFERRAL_REWARD: "REFERRAL_REWARD",
            STAKING: "STAKING",
            STAKING_REWARD: "STAKING_REWARD",
            P2P_OFFER_TRANSFER: "P2P_OFFER_TRANSFER",
            P2P_TRADE: "P2P_TRADE",
            NFT_PURCHASE: "NFT_PURCHASE",
            NFT_SALE: "NFT_SALE",
            NFT_MINT: "NFT_MINT",
            NFT_BURN: "NFT_BURN",
            NFT_TRANSFER: "NFT_TRANSFER",
            NFT_AUCTION_BID: "NFT_AUCTION_BID",
            NFT_AUCTION_SETTLE: "NFT_AUCTION_SETTLE",
            NFT_OFFER: "NFT_OFFER",
            BINARY_ORDER_WIN: "BINARY_ORDER",
            BINARY_ORDER_LOSS: "BINARY_ORDER",
            HOLD: "EXCHANGE_ORDER",
            RELEASE: "EXCHANGE_ORDER",
            TRADE_DEBIT: "EXCHANGE_ORDER",
            TRADE_CREDIT: "EXCHANGE_ORDER",
            FEE: "PAYMENT",
            REFUND_WITHDRAWAL: "REFUND",
            ADJUSTMENT: "DEPOSIT",
            STAKING_DEPOSIT: "STAKING",
            STAKING_WITHDRAW: "STAKING",
            ECO_DEPOSIT: "DEPOSIT",
            ECO_WITHDRAW: "WITHDRAW",
            ECO_REFUND: "REFUND",
            ECO_FEE: "PAYMENT",
            COPY_TRADING_REVERSAL: "REFUND",
            P2P_DISPUTE_RESOLVE: "P2P_TRADE",
            P2P_DISPUTE_RECEIVE: "P2P_TRADE",
            P2P_TRADE_RESOLVE: "P2P_TRADE",
            P2P_TRADE_RECEIVE: "P2P_TRADE",
            P2P_TRADE_RELEASE: "P2P_TRADE",
            P2P_TRADE_LOCK: "P2P_TRADE",
            P2P_TRADE_CANCEL: "P2P_TRADE",
            P2P_TRADE_EXPIRED: "P2P_TRADE",
            P2P_OFFER_LOCK: "P2P_OFFER_TRANSFER",
            P2P_OFFER_DELETE: "P2P_OFFER_TRANSFER",
            P2P_ADMIN_OFFER_DISABLE: "P2P_OFFER_TRANSFER",
            P2P_ADMIN_OFFER_REJECT: "P2P_OFFER_TRANSFER",
        };
        return (mapping[operationType] || "PAYMENT");
    }
    async credit(operation) {
        this.validateAmount(operation.amount, "Credit");
        const executeInTransaction = async (t) => {
            const { isDuplicate, existingTransactionId } = await this.checkIdempotency(operation.idempotencyKey, t);
            if (isDuplicate) {
                throw new errors_1.DuplicateOperationError(operation.idempotencyKey, existingTransactionId);
            }
            const wallet = operation.walletId
                ? await this.getWalletById(operation.walletId, { transaction: t, lock: true })
                : await this.getWallet(operation.userId, operation.walletType, operation.currency, {
                    transaction: t,
                    lock: true,
                    createIfMissing: true,
                });
            this.validateWalletStatus(wallet);
            const creditAmount = (0, precision_1.roundToPrecision)(operation.amount, operation.currency);
            const previousBalance = wallet.balance;
            const newBalance = (0, precision_1.safeAdd)(previousBalance, creditAmount, operation.currency);
            await db_1.models.wallet.update({ balance: newBalance }, { where: { id: wallet.id }, transaction: t });
            const resolvedUserId = operation.userId || wallet.userId;
            const txRecord = await db_1.models.transaction.create({
                userId: resolvedUserId,
                walletId: wallet.id,
                type: this.mapOperationTypeToTransactionType(operation.operationType),
                status: "COMPLETED",
                amount: creditAmount,
                fee: operation.fee || 0,
                description: operation.description,
                referenceId: operation.referenceId,
                metadata: JSON.stringify({
                    idempotencyKey: operation.idempotencyKey,
                    operationType: operation.operationType,
                    previousBalance,
                    newBalance,
                    ...operation.metadata,
                }),
            }, { transaction: t });
            await this.auditLogger.logCredit(wallet.id, resolvedUserId, creditAmount, previousBalance, newBalance, txRecord.id, operation.idempotencyKey, operation.metadata);
            return {
                success: true,
                walletId: wallet.id,
                transactionId: txRecord.id,
                previousBalance,
                newBalance,
                previousInOrder: wallet.inOrder,
                newInOrder: wallet.inOrder,
                timestamp: new Date(),
            };
        };
        if (operation.transaction) {
            return executeInTransaction(operation.transaction);
        }
        return await db_1.sequelize.transaction(executeInTransaction);
    }
    async debit(operation) {
        this.validateAmount(operation.amount, "Debit");
        const executeInTransaction = async (t) => {
            const { isDuplicate, existingTransactionId } = await this.checkIdempotency(operation.idempotencyKey, t);
            if (isDuplicate) {
                throw new errors_1.DuplicateOperationError(operation.idempotencyKey, existingTransactionId);
            }
            const wallet = operation.walletId
                ? await this.getWalletById(operation.walletId, { transaction: t, lock: true })
                : await this.getWallet(operation.userId, operation.walletType, operation.currency, {
                    transaction: t,
                    lock: true,
                });
            this.validateWalletStatus(wallet);
            const debitAmount = (0, precision_1.roundToPrecision)(operation.amount, operation.currency);
            const feeAmount = (0, precision_1.roundToPrecision)(operation.fee || 0, operation.currency);
            const totalDebit = (0, precision_1.safeAdd)(debitAmount, feeAmount, operation.currency);
            const previousBalance = wallet.balance;
            if (previousBalance < totalDebit) {
                throw new errors_1.InsufficientFundsError(previousBalance, totalDebit, operation.currency);
            }
            const newBalance = (0, precision_1.safeSubtract)(previousBalance, totalDebit, operation.currency);
            if (newBalance < 0) {
                throw new errors_1.NegativeBalanceError(wallet.id, newBalance);
            }
            await db_1.models.wallet.update({ balance: newBalance }, { where: { id: wallet.id }, transaction: t });
            const resolvedUserId = operation.userId || wallet.userId;
            const txRecord = await db_1.models.transaction.create({
                userId: resolvedUserId,
                walletId: wallet.id,
                type: this.mapOperationTypeToTransactionType(operation.operationType),
                status: "COMPLETED",
                amount: debitAmount,
                fee: feeAmount,
                description: operation.description,
                referenceId: operation.referenceId,
                metadata: JSON.stringify({
                    idempotencyKey: operation.idempotencyKey,
                    operationType: operation.operationType,
                    previousBalance,
                    newBalance,
                    totalDebit,
                    ...operation.metadata,
                }),
            }, { transaction: t });
            await this.auditLogger.logDebit(wallet.id, resolvedUserId, totalDebit, previousBalance, newBalance, txRecord.id, operation.idempotencyKey, operation.metadata);
            return {
                success: true,
                walletId: wallet.id,
                transactionId: txRecord.id,
                previousBalance,
                newBalance,
                previousInOrder: wallet.inOrder,
                newInOrder: wallet.inOrder,
                timestamp: new Date(),
            };
        };
        if (operation.transaction) {
            return executeInTransaction(operation.transaction);
        }
        return await db_1.sequelize.transaction(executeInTransaction);
    }
    async hold(operation) {
        this.validateAmount(operation.amount, "Hold");
        const executeInTransaction = async (t) => {
            const { isDuplicate, existingTransactionId } = await this.checkIdempotency(operation.idempotencyKey, t);
            if (isDuplicate) {
                throw new errors_1.DuplicateOperationError(operation.idempotencyKey, existingTransactionId);
            }
            const wallet = operation.walletId
                ? await this.getWalletById(operation.walletId, { transaction: t, lock: true })
                : await this.getWallet(operation.userId, operation.walletType, operation.currency, {
                    transaction: t,
                    lock: true,
                });
            this.validateWalletStatus(wallet);
            const holdAmount = (0, precision_1.roundToPrecision)(operation.amount, operation.currency);
            const previousBalance = wallet.balance;
            const previousInOrder = wallet.inOrder;
            if (previousBalance < holdAmount) {
                throw new errors_1.InsufficientFundsError(previousBalance, holdAmount, operation.currency);
            }
            const newBalance = (0, precision_1.safeSubtract)(previousBalance, holdAmount, operation.currency);
            const newInOrder = (0, precision_1.safeAdd)(previousInOrder, holdAmount, operation.currency);
            if (newBalance < 0) {
                throw new errors_1.NegativeBalanceError(wallet.id, newBalance);
            }
            await db_1.models.wallet.update({ balance: newBalance, inOrder: newInOrder }, { where: { id: wallet.id }, transaction: t });
            const resolvedUserId = operation.userId || wallet.userId;
            const txRecord = await db_1.models.transaction.create({
                userId: resolvedUserId,
                walletId: wallet.id,
                type: this.mapOperationTypeToTransactionType(operation.operationType || "HOLD"),
                status: "COMPLETED",
                amount: holdAmount,
                fee: 0,
                description: operation.reason,
                metadata: JSON.stringify({
                    idempotencyKey: operation.idempotencyKey,
                    operationType: operation.operationType || "HOLD",
                    previousBalance,
                    newBalance,
                    previousInOrder,
                    newInOrder,
                    expiresAt: operation.expiresAt,
                    ...operation.metadata,
                }),
            }, { transaction: t });
            await this.auditLogger.logHold(wallet.id, resolvedUserId, holdAmount, previousBalance, newBalance, previousInOrder, newInOrder, txRecord.id, operation.idempotencyKey, operation.metadata);
            return {
                success: true,
                walletId: wallet.id,
                transactionId: txRecord.id,
                previousBalance,
                newBalance,
                previousInOrder,
                newInOrder,
                timestamp: new Date(),
            };
        };
        if (operation.transaction) {
            return executeInTransaction(operation.transaction);
        }
        return await db_1.sequelize.transaction(executeInTransaction);
    }
    async release(operation) {
        this.validateAmount(operation.amount, "Release");
        const executeInTransaction = async (t) => {
            const { isDuplicate, existingTransactionId } = await this.checkIdempotency(operation.idempotencyKey, t);
            if (isDuplicate) {
                throw new errors_1.DuplicateOperationError(operation.idempotencyKey, existingTransactionId);
            }
            const wallet = operation.walletId
                ? await this.getWalletById(operation.walletId, { transaction: t, lock: true })
                : await this.getWallet(operation.userId, operation.walletType, operation.currency, {
                    transaction: t,
                    lock: true,
                });
            this.validateWalletStatus(wallet);
            const releaseAmount = (0, precision_1.roundToPrecision)(operation.amount, operation.currency);
            const previousBalance = wallet.balance;
            const previousInOrder = wallet.inOrder;
            if (previousInOrder < releaseAmount) {
                throw new errors_1.InsufficientHeldFundsError(previousInOrder, releaseAmount, operation.currency);
            }
            const newBalance = (0, precision_1.safeAdd)(previousBalance, releaseAmount, operation.currency);
            const newInOrder = (0, precision_1.safeSubtract)(previousInOrder, releaseAmount, operation.currency);
            if (newInOrder < 0) {
                throw new errors_1.NegativeInOrderError(wallet.id, newInOrder);
            }
            await db_1.models.wallet.update({ balance: newBalance, inOrder: newInOrder }, { where: { id: wallet.id }, transaction: t });
            const resolvedUserId = operation.userId || wallet.userId;
            const txRecord = await db_1.models.transaction.create({
                userId: resolvedUserId,
                walletId: wallet.id,
                type: this.mapOperationTypeToTransactionType(operation.operationType || "RELEASE"),
                status: "COMPLETED",
                amount: releaseAmount,
                fee: 0,
                description: operation.reason,
                metadata: JSON.stringify({
                    idempotencyKey: operation.idempotencyKey,
                    operationType: operation.operationType || "RELEASE",
                    previousBalance,
                    newBalance,
                    previousInOrder,
                    newInOrder,
                    ...operation.metadata,
                }),
            }, { transaction: t });
            await this.auditLogger.logRelease(wallet.id, resolvedUserId, releaseAmount, previousBalance, newBalance, previousInOrder, newInOrder, txRecord.id, operation.idempotencyKey, operation.metadata);
            return {
                success: true,
                walletId: wallet.id,
                transactionId: txRecord.id,
                previousBalance,
                newBalance,
                previousInOrder,
                newInOrder,
                timestamp: new Date(),
            };
        };
        if (operation.transaction) {
            return executeInTransaction(operation.transaction);
        }
        return await db_1.sequelize.transaction(executeInTransaction);
    }
    async executeFromHold(operation) {
        this.validateAmount(operation.amount, "Execute");
        const executeInTransaction = async (t) => {
            const { isDuplicate, existingTransactionId } = await this.checkIdempotency(operation.idempotencyKey, t);
            if (isDuplicate) {
                throw new errors_1.DuplicateOperationError(operation.idempotencyKey, existingTransactionId);
            }
            const wallet = operation.walletId
                ? await this.getWalletById(operation.walletId, { transaction: t, lock: true })
                : await this.getWallet(operation.userId, operation.walletType, operation.currency, {
                    transaction: t,
                    lock: true,
                });
            this.validateWalletStatus(wallet);
            const executeAmount = (0, precision_1.roundToPrecision)(operation.amount, operation.currency);
            const feeAmount = (0, precision_1.roundToPrecision)(operation.fee || 0, operation.currency);
            const totalExecute = (0, precision_1.safeAdd)(executeAmount, feeAmount, operation.currency);
            const previousInOrder = wallet.inOrder;
            const previousBalance = wallet.balance;
            if (previousInOrder < totalExecute) {
                throw new errors_1.InsufficientHeldFundsError(previousInOrder, totalExecute, operation.currency);
            }
            const newInOrder = (0, precision_1.safeSubtract)(previousInOrder, totalExecute, operation.currency);
            if (newInOrder < 0) {
                throw new errors_1.NegativeInOrderError(wallet.id, newInOrder);
            }
            await db_1.models.wallet.update({ inOrder: newInOrder }, { where: { id: wallet.id }, transaction: t });
            const resolvedUserId = operation.userId || wallet.userId;
            const txRecord = await db_1.models.transaction.create({
                userId: resolvedUserId,
                walletId: wallet.id,
                type: this.mapOperationTypeToTransactionType(operation.operationType),
                status: "COMPLETED",
                amount: executeAmount,
                fee: feeAmount,
                description: operation.description,
                referenceId: operation.referenceId,
                metadata: JSON.stringify({
                    idempotencyKey: operation.idempotencyKey,
                    operationType: operation.operationType,
                    previousInOrder,
                    newInOrder,
                    ...operation.metadata,
                }),
            }, { transaction: t });
            await this.auditLogger.logExecuteFromHold(wallet.id, resolvedUserId, totalExecute, previousInOrder, newInOrder, txRecord.id, operation.idempotencyKey, operation.metadata);
            return {
                success: true,
                walletId: wallet.id,
                transactionId: txRecord.id,
                previousBalance,
                newBalance: previousBalance,
                previousInOrder,
                newInOrder,
                timestamp: new Date(),
            };
        };
        if (operation.transaction) {
            return executeInTransaction(operation.transaction);
        }
        return await db_1.sequelize.transaction(executeInTransaction);
    }
    async transfer(operation) {
        this.validateAmount(operation.amount, "Transfer");
        if (operation.fromUserId === operation.toUserId &&
            operation.fromWalletType === operation.toWalletType &&
            operation.fromCurrency === operation.toCurrency) {
            throw new errors_1.TransferError("Cannot transfer to the same wallet");
        }
        const executeInTransaction = async (t) => {
            const { isDuplicate, existingTransactionId } = await this.checkIdempotency(operation.idempotencyKey, t);
            if (isDuplicate) {
                throw new errors_1.DuplicateOperationError(operation.idempotencyKey, existingTransactionId);
            }
            const fromWallet = await this.getWallet(operation.fromUserId, operation.fromWalletType, operation.fromCurrency, { transaction: t, lock: true });
            const toWallet = await this.getWallet(operation.toUserId, operation.toWalletType, operation.toCurrency, { transaction: t, lock: true, createIfMissing: true });
            this.validateWalletStatus(fromWallet);
            this.validateWalletStatus(toWallet);
            const transferAmount = (0, precision_1.roundToPrecision)(operation.amount, operation.fromCurrency);
            const feePercentage = operation.feePercentage || 0;
            const feeAmount = (0, precision_1.roundToPrecision)((transferAmount * feePercentage) / 100, operation.fromCurrency);
            const totalDebit = (0, precision_1.safeAdd)(transferAmount, feeAmount, operation.fromCurrency);
            const exchangeRate = operation.exchangeRate || 1;
            const receiveAmount = (0, precision_1.roundToPrecision)(transferAmount * exchangeRate, operation.toCurrency);
            const fromBalance = fromWallet.balance;
            if (fromBalance < totalDebit) {
                throw new errors_1.InsufficientFundsError(fromBalance, totalDebit, operation.fromCurrency);
            }
            const newFromBalance = (0, precision_1.safeSubtract)(fromBalance, totalDebit, operation.fromCurrency);
            const toBalance = toWallet.balance;
            const newToBalance = (0, precision_1.safeAdd)(toBalance, receiveAmount, operation.toCurrency);
            if (newFromBalance < 0) {
                throw new errors_1.NegativeBalanceError(fromWallet.id, newFromBalance);
            }
            await db_1.models.wallet.update({ balance: newFromBalance }, { where: { id: fromWallet.id }, transaction: t });
            await db_1.models.wallet.update({ balance: newToBalance }, { where: { id: toWallet.id }, transaction: t });
            const fromTx = await db_1.models.transaction.create({
                userId: operation.fromUserId,
                walletId: fromWallet.id,
                type: "OUTGOING_TRANSFER",
                status: "COMPLETED",
                amount: transferAmount,
                fee: feeAmount,
                description: operation.description,
                metadata: JSON.stringify({
                    idempotencyKey: operation.idempotencyKey,
                    previousBalance: fromBalance,
                    newBalance: newFromBalance,
                    toWalletId: toWallet.id,
                    toUserId: operation.toUserId,
                    exchangeRate,
                    ...operation.metadata,
                }),
            }, { transaction: t });
            const toTx = await db_1.models.transaction.create({
                userId: operation.toUserId,
                walletId: toWallet.id,
                type: "INCOMING_TRANSFER",
                status: "COMPLETED",
                amount: receiveAmount,
                fee: 0,
                description: operation.description,
                metadata: JSON.stringify({
                    idempotencyKey: `${operation.idempotencyKey}_receive`,
                    previousBalance: toBalance,
                    newBalance: newToBalance,
                    fromWalletId: fromWallet.id,
                    fromUserId: operation.fromUserId,
                    exchangeRate,
                    ...operation.metadata,
                }),
            }, { transaction: t });
            if (feeAmount > 0) {
                await (0, fees_1.collectPlatformFee)({
                    userId: operation.fromUserId,
                    currency: operation.fromCurrency,
                    walletType: operation.fromWalletType,
                    feeAmount,
                    type: "TRANSFER",
                    description: `Transfer fee from user ${operation.fromUserId}`,
                    referenceId: fromTx.id,
                    metadata: { fromUserId: operation.fromUserId, toUserId: operation.toUserId },
                    transaction: t,
                });
            }
            await this.auditLogger.logTransferOut(fromWallet.id, operation.fromUserId, totalDebit, fromBalance, newFromBalance, fromTx.id, operation.idempotencyKey, toWallet.id, feeAmount, operation.metadata);
            await this.auditLogger.logTransferIn(toWallet.id, operation.toUserId, receiveAmount, toBalance, newToBalance, toTx.id, `${operation.idempotencyKey}_receive`, fromWallet.id, operation.metadata);
            return {
                fromResult: {
                    success: true,
                    walletId: fromWallet.id,
                    transactionId: fromTx.id,
                    previousBalance: fromBalance,
                    newBalance: newFromBalance,
                    previousInOrder: fromWallet.inOrder,
                    newInOrder: fromWallet.inOrder,
                    timestamp: new Date(),
                },
                toResult: {
                    success: true,
                    walletId: toWallet.id,
                    transactionId: toTx.id,
                    previousBalance: toBalance,
                    newBalance: newToBalance,
                    previousInOrder: toWallet.inOrder,
                    newInOrder: toWallet.inOrder,
                    timestamp: new Date(),
                },
                fee: feeAmount,
            };
        };
        if (operation.transaction) {
            return executeInTransaction(operation.transaction);
        }
        return await db_1.sequelize.transaction(executeInTransaction);
    }
    async getTotalValue(userId, type, currency) {
        const wallet = await this.getWallet(userId, type, currency);
        return (0, precision_1.safeAdd)(wallet.balance, wallet.inOrder, currency);
    }
    async getAvailableBalance(userId, type, currency) {
        const wallet = await this.getWallet(userId, type, currency);
        return wallet.balance;
    }
    async getUserWallets(userId, type) {
        const where = { userId };
        if (type) {
            where.type = type;
        }
        const wallets = await db_1.models.wallet.findAll({ where });
        return wallets.map((w) => {
            var _a, _b;
            const plain = w.get({ plain: true });
            const balance = parseFloat(((_a = plain.balance) === null || _a === void 0 ? void 0 : _a.toString()) || "0");
            const inOrder = parseFloat(((_b = plain.inOrder) === null || _b === void 0 ? void 0 : _b.toString()) || "0");
            return {
                walletId: plain.id,
                userId: plain.userId,
                type: plain.type,
                currency: plain.currency,
                balance,
                inOrder,
                totalValue: balance + inOrder,
                timestamp: new Date(),
            };
        });
    }
    async verifyWalletIntegrity(walletId) {
        var _a, _b;
        const wallet = await this.getWalletById(walletId);
        const transactions = await db_1.models.transaction.findAll({
            where: { walletId, status: "COMPLETED" },
        });
        let expectedBalance = 0;
        for (const tx of transactions) {
            const amount = parseFloat(((_a = tx.amount) === null || _a === void 0 ? void 0 : _a.toString()) || "0");
            const fee = parseFloat(((_b = tx.fee) === null || _b === void 0 ? void 0 : _b.toString()) || "0");
            const metadata = typeof tx.metadata === 'string'
                ? JSON.parse(tx.metadata)
                : tx.metadata || {};
            const operationType = metadata.operationType || tx.type;
            switch (operationType) {
                case "DEPOSIT":
                case "INCOMING_TRANSFER":
                case "REFUND":
                case "REFUND_WITHDRAWAL":
                case "TRADE_CREDIT":
                case "BINARY_ORDER_WIN":
                case "AI_INVESTMENT_ROI":
                case "STAKING_REWARD":
                case "RELEASE":
                    expectedBalance += amount;
                    break;
                case "WITHDRAW":
                case "OUTGOING_TRANSFER":
                case "FEE":
                case "TRADE_DEBIT":
                case "BINARY_ORDER":
                case "BINARY_ORDER_LOSS":
                case "AI_INVESTMENT":
                case "ICO_CONTRIBUTION":
                case "STAKING_DEPOSIT":
                case "HOLD":
                    expectedBalance -= amount + fee;
                    break;
                case "EXCHANGE_ORDER":
                    break;
            }
        }
        const actualBalance = wallet.balance;
        const discrepancy = Math.abs(expectedBalance - actualBalance);
        return {
            isValid: discrepancy < 0.00000001,
            expectedBalance: (0, precision_1.roundToPrecision)(expectedBalance, wallet.currency),
            actualBalance,
            discrepancy,
        };
    }
    async hasSufficientBalance(userId, type, currency, amount) {
        try {
            const wallet = await this.getWallet(userId, type, currency);
            return wallet.balance >= amount;
        }
        catch (error) {
            if (error instanceof errors_1.WalletNotFoundError) {
                return false;
            }
            throw error;
        }
    }
    async getChainPrecision(currency, chain) {
        return await PrecisionCacheService_1.precisionCacheService.getPrecision("ECO", currency, chain);
    }
    async updateBalancePrecision(amount, currency, chain) {
        const precision = await this.getChainPrecision(currency, chain);
        return parseFloat(amount.toFixed(precision));
    }
    parseAddressJson(addressStr) {
        if (typeof addressStr === "object" && addressStr !== null) {
            return addressStr;
        }
        try {
            return JSON.parse(addressStr || "{}");
        }
        catch (_a) {
            return {};
        }
    }
    async ecoCredit(operation) {
        this.validateAmount(operation.amount, "Eco Credit");
        const executeInTransaction = async (t) => {
            var _a, _b;
            const { isDuplicate, existingTransactionId } = await this.checkIdempotency(operation.idempotencyKey, t);
            if (isDuplicate) {
                throw new errors_1.DuplicateOperationError(operation.idempotencyKey, existingTransactionId);
            }
            const walletRecord = await db_1.models.wallet.findOne({
                where: { id: operation.walletId },
                lock: sequelize_1.Transaction.LOCK.UPDATE,
                transaction: t,
            });
            if (!walletRecord) {
                throw new errors_1.WalletNotFoundError(operation.walletId);
            }
            const wallet = this.toWalletAttributes(walletRecord);
            this.validateWalletStatus(wallet);
            const addresses = this.parseAddressJson(wallet.address);
            const chain = operation.chain;
            const currency = operation.currency;
            const precisionAmount = await this.updateBalancePrecision(operation.amount, currency, chain);
            let previousChainBalance = 0;
            let newChainBalance = 0;
            if (addresses[chain]) {
                previousChainBalance = await this.updateBalancePrecision(parseFloat(((_a = addresses[chain].balance) === null || _a === void 0 ? void 0 : _a.toString()) || "0"), currency, chain);
                newChainBalance = await this.updateBalancePrecision(previousChainBalance + precisionAmount, currency, chain);
                addresses[chain].balance = newChainBalance;
            }
            const previousBalance = wallet.balance;
            const newBalance = await this.updateBalancePrecision(previousBalance + precisionAmount, currency, chain);
            await db_1.models.wallet.update({
                balance: newBalance,
                address: addresses,
            }, { where: { id: wallet.id }, transaction: t });
            const walletData = await db_1.models.walletData.findOne({
                where: { walletId: wallet.id, chain },
                transaction: t,
            });
            if (walletData) {
                const currentWalletDataBalance = parseFloat(((_b = walletData.balance) === null || _b === void 0 ? void 0 : _b.toString()) || "0");
                const newWalletDataBalance = await this.updateBalancePrecision(currentWalletDataBalance + precisionAmount, currency, chain);
                await db_1.models.walletData.update({ balance: newWalletDataBalance }, { where: { walletId: wallet.id, chain }, transaction: t });
            }
            const fromAddress = Array.isArray(operation.fromAddress)
                ? operation.fromAddress[0] || "Unknown"
                : operation.fromAddress || "Unknown";
            const txRecord = await db_1.models.transaction.create({
                userId: operation.userId,
                walletId: wallet.id,
                type: this.mapOperationTypeToTransactionType(operation.operationType),
                status: "COMPLETED",
                amount: precisionAmount,
                fee: operation.fee || 0,
                description: operation.description || `Deposit of ${precisionAmount} ${operation.currency} from ${fromAddress}`,
                trxId: operation.txHash,
                referenceId: operation.referenceId,
                metadata: JSON.stringify({
                    idempotencyKey: operation.idempotencyKey,
                    chain,
                    currency: operation.currency,
                    previousBalance,
                    newBalance,
                    previousChainBalance,
                    newChainBalance,
                    from: operation.fromAddress,
                    to: operation.toAddress,
                    ...operation.metadata,
                }),
            }, { transaction: t });
            await this.auditLogger.logCredit(wallet.id, operation.userId, precisionAmount, previousBalance, newBalance, txRecord.id, operation.idempotencyKey, { chain, previousChainBalance, newChainBalance, ...operation.metadata });
            return {
                success: true,
                walletId: wallet.id,
                transactionId: txRecord.id,
                previousBalance,
                newBalance,
                previousChainBalance,
                newChainBalance,
                chain,
                timestamp: new Date(),
            };
        };
        if (operation.transaction) {
            return executeInTransaction(operation.transaction);
        }
        return await db_1.sequelize.transaction(executeInTransaction);
    }
    async ecoDebit(operation) {
        this.validateAmount(operation.amount, "Eco Debit");
        const executeInTransaction = async (t) => {
            var _a, _b;
            const { isDuplicate, existingTransactionId } = await this.checkIdempotency(operation.idempotencyKey, t);
            if (isDuplicate) {
                throw new errors_1.DuplicateOperationError(operation.idempotencyKey, existingTransactionId);
            }
            const walletRecord = await db_1.models.wallet.findOne({
                where: { id: operation.walletId },
                lock: sequelize_1.Transaction.LOCK.UPDATE,
                transaction: t,
            });
            if (!walletRecord) {
                throw new errors_1.WalletNotFoundError(operation.walletId);
            }
            const wallet = this.toWalletAttributes(walletRecord);
            this.validateWalletStatus(wallet);
            const addresses = this.parseAddressJson(wallet.address);
            const chain = operation.chain;
            const currency = operation.currency;
            const precisionAmount = await this.updateBalancePrecision(operation.amount, currency, chain);
            const previousBalance = wallet.balance;
            const newBalance = await this.updateBalancePrecision(previousBalance - precisionAmount, currency, chain);
            if (newBalance < 0) {
                throw new errors_1.NegativeBalanceError(wallet.id, newBalance);
            }
            let previousChainBalance = 0;
            let newChainBalance = 0;
            if (addresses[chain]) {
                previousChainBalance = await this.updateBalancePrecision(parseFloat(((_a = addresses[chain].balance) === null || _a === void 0 ? void 0 : _a.toString()) || "0"), currency, chain);
                newChainBalance = await this.updateBalancePrecision(previousChainBalance - precisionAmount, currency, chain);
                if (newChainBalance < 0) {
                    newChainBalance = 0;
                }
                addresses[chain].balance = newChainBalance;
            }
            else {
                throw (0, error_1.createError)({ statusCode: 404, message: `Chain ${chain} not found in wallet addresses` });
            }
            await db_1.models.wallet.update({
                balance: newBalance,
                address: addresses,
            }, { where: { id: wallet.id }, transaction: t });
            const walletData = await db_1.models.walletData.findOne({
                where: { walletId: wallet.id, chain },
                transaction: t,
            });
            if (walletData) {
                const currentWalletDataBalance = parseFloat(((_b = walletData.balance) === null || _b === void 0 ? void 0 : _b.toString()) || "0");
                let newWalletDataBalance = await this.updateBalancePrecision(currentWalletDataBalance - precisionAmount, currency, chain);
                if (newWalletDataBalance < 0) {
                    newWalletDataBalance = 0;
                }
                await db_1.models.walletData.update({ balance: newWalletDataBalance }, { where: { walletId: wallet.id, chain }, transaction: t });
            }
            await this.auditLogger.logDebit(wallet.id, operation.userId, precisionAmount, previousBalance, newBalance, operation.idempotencyKey, operation.idempotencyKey, { chain, previousChainBalance, newChainBalance, ...operation.metadata });
            return {
                success: true,
                walletId: wallet.id,
                transactionId: operation.idempotencyKey,
                previousBalance,
                newBalance,
                previousChainBalance,
                newChainBalance,
                chain,
                timestamp: new Date(),
            };
        };
        if (operation.transaction) {
            return executeInTransaction(operation.transaction);
        }
        return await db_1.sequelize.transaction(executeInTransaction);
    }
    async ecoRefund(operation) {
        this.validateAmount(operation.amount, "Eco Refund");
        const executeInTransaction = async (t) => {
            var _a, _b;
            const { isDuplicate, existingTransactionId } = await this.checkIdempotency(operation.idempotencyKey, t);
            if (isDuplicate) {
                throw new errors_1.DuplicateOperationError(operation.idempotencyKey, existingTransactionId);
            }
            const walletRecord = await db_1.models.wallet.findOne({
                where: { id: operation.walletId },
                lock: sequelize_1.Transaction.LOCK.UPDATE,
                transaction: t,
            });
            if (!walletRecord) {
                throw new errors_1.WalletNotFoundError(operation.walletId);
            }
            const wallet = this.toWalletAttributes(walletRecord);
            const addresses = this.parseAddressJson(wallet.address);
            const chain = operation.chain;
            const currency = operation.currency;
            const precisionAmount = await this.updateBalancePrecision(operation.amount, currency, chain);
            let previousChainBalance = 0;
            let newChainBalance = 0;
            if (chain && addresses[chain]) {
                previousChainBalance = await this.updateBalancePrecision(parseFloat(((_a = addresses[chain].balance) === null || _a === void 0 ? void 0 : _a.toString()) || "0"), currency, chain);
                newChainBalance = await this.updateBalancePrecision(previousChainBalance + precisionAmount, currency, chain);
                addresses[chain].balance = newChainBalance;
            }
            const previousBalance = wallet.balance;
            const newBalance = await this.updateBalancePrecision(previousBalance + precisionAmount, currency, chain);
            await db_1.models.wallet.update({
                balance: newBalance,
                address: addresses,
            }, { where: { id: wallet.id }, transaction: t });
            if (chain) {
                const walletData = await db_1.models.walletData.findOne({
                    where: { walletId: wallet.id, chain },
                    transaction: t,
                });
                if (walletData) {
                    const currentWalletDataBalance = parseFloat(((_b = walletData.balance) === null || _b === void 0 ? void 0 : _b.toString()) || "0");
                    const newWalletDataBalance = await this.updateBalancePrecision(currentWalletDataBalance + precisionAmount, currency, chain);
                    await db_1.models.walletData.update({ balance: newWalletDataBalance }, { where: { walletId: wallet.id, chain }, transaction: t });
                }
            }
            await this.auditLogger.logCredit(wallet.id, operation.userId, precisionAmount, previousBalance, newBalance, operation.idempotencyKey, operation.idempotencyKey, { chain, previousChainBalance, newChainBalance, refund: true, ...operation.metadata });
            return {
                success: true,
                walletId: wallet.id,
                transactionId: operation.idempotencyKey,
                previousBalance,
                newBalance,
                previousChainBalance,
                newChainBalance,
                chain,
                timestamp: new Date(),
            };
        };
        if (operation.transaction) {
            return executeInTransaction(operation.transaction);
        }
        return await db_1.sequelize.transaction(executeInTransaction);
    }
    async ecoChainTransfer(operation) {
        this.validateAmount(operation.fromAmount, "Eco Chain Transfer (from)");
        this.validateAmount(operation.toAmount, "Eco Chain Transfer (to)");
        const executeInTransaction = async (t) => {
            const { currency, chain, fromWalletId, toWalletId, fromAmount, toAmount } = operation;
            if (operation.idempotencyKey) {
                const { isDuplicate } = await this.checkIdempotency(operation.idempotencyKey, t);
                if (isDuplicate) {
                    console.warn(`[WALLET] Duplicate ecoChainTransfer detected: ${operation.idempotencyKey}`);
                    return {
                        success: true,
                        chain,
                        from: { walletId: fromWalletId, previousChainBalance: 0, newChainBalance: 0 },
                        to: { walletId: toWalletId, previousChainBalance: 0, newChainBalance: 0 },
                        timestamp: new Date(),
                    };
                }
            }
            const fromWalletData = await db_1.models.walletData.findOne({
                where: { walletId: fromWalletId, currency, chain },
                transaction: t,
            });
            let fromPreviousChainBalance = 0;
            let fromNewChainBalance = 0;
            if (fromWalletData) {
                fromPreviousChainBalance = parseFloat(String(fromWalletData.balance)) || 0;
                fromNewChainBalance = await this.updateBalancePrecision(Math.max(0, fromPreviousChainBalance - fromAmount), currency, chain);
                await db_1.models.walletData.update({ balance: fromNewChainBalance }, { where: { id: fromWalletData.id }, transaction: t });
                const fromWalletRecord = await db_1.models.wallet.findOne({
                    where: { id: fromWalletId },
                    transaction: t,
                });
                if (fromWalletRecord) {
                    const fromAddresses = this.parseAddressJson(fromWalletRecord.address);
                    if (fromAddresses[chain]) {
                        fromAddresses[chain].balance = fromNewChainBalance;
                        await db_1.models.wallet.update({ address: fromAddresses }, { where: { id: fromWalletId }, transaction: t });
                    }
                }
                const { ledgerService } = require("./LedgerService");
                await ledgerService.updateLedger({
                    walletId: fromWalletId,
                    index: fromWalletData.index,
                    currency,
                    chain,
                    amount: fromAmount,
                    transaction: t,
                });
            }
            const toWalletData = await db_1.models.walletData.findOne({
                where: { walletId: toWalletId, currency, chain },
                transaction: t,
            });
            let toPreviousChainBalance = 0;
            let toNewChainBalance = 0;
            if (toWalletData) {
                toPreviousChainBalance = parseFloat(String(toWalletData.balance)) || 0;
                toNewChainBalance = await this.updateBalancePrecision(toPreviousChainBalance + toAmount, currency, chain);
                await db_1.models.walletData.update({ balance: toNewChainBalance }, { where: { id: toWalletData.id }, transaction: t });
                const toWalletRecord = await db_1.models.wallet.findOne({
                    where: { id: toWalletId },
                    transaction: t,
                });
                if (toWalletRecord) {
                    const toAddresses = this.parseAddressJson(toWalletRecord.address);
                    if (toAddresses[chain]) {
                        toAddresses[chain].balance = toNewChainBalance;
                        await db_1.models.wallet.update({ address: toAddresses }, { where: { id: toWalletId }, transaction: t });
                    }
                }
                const { ledgerService } = require("./LedgerService");
                await ledgerService.updateLedger({
                    walletId: toWalletId,
                    index: toWalletData.index,
                    currency,
                    chain,
                    amount: -toAmount,
                    transaction: t,
                });
            }
            await this.auditLogger.logCredit(toWalletId, "system", toAmount, toPreviousChainBalance, toNewChainBalance, operation.idempotencyKey, operation.idempotencyKey, {
                type: "ECO_CHAIN_TRANSFER",
                chain,
                fromWalletId,
                toWalletId,
                fromAmount,
                toAmount,
                ...operation.metadata,
            });
            if (operation.idempotencyKey) {
                const receiverWallet = await db_1.models.wallet.findOne({
                    where: { id: toWalletId },
                    attributes: ["userId"],
                    transaction: t,
                });
                if (receiverWallet) {
                    await db_1.models.transaction.create({
                        id: operation.idempotencyKey,
                        userId: receiverWallet.userId,
                        walletId: toWalletId,
                        type: "INCOMING_TRANSFER",
                        status: "COMPLETED",
                        amount: toAmount,
                        fee: 0,
                        description: `ECO chain transfer: ${fromWalletId} -> ${toWalletId}`,
                        metadata: JSON.stringify({
                            idempotencyKey: operation.idempotencyKey,
                            type: "ECO_CHAIN_TRANSFER",
                            chain,
                            fromWalletId,
                            toWalletId,
                            fromAmount,
                            toAmount,
                            ...operation.metadata,
                        }),
                    }, { transaction: t });
                }
            }
            return {
                success: true,
                chain,
                from: {
                    walletId: fromWalletId,
                    previousChainBalance: fromPreviousChainBalance,
                    newChainBalance: fromNewChainBalance,
                },
                to: {
                    walletId: toWalletId,
                    previousChainBalance: toPreviousChainBalance,
                    newChainBalance: toNewChainBalance,
                },
                timestamp: new Date(),
            };
        };
        if (operation.transaction) {
            return executeInTransaction(operation.transaction);
        }
        return await db_1.sequelize.transaction(executeInTransaction);
    }
}
exports.WalletService = WalletService;
exports.walletService = WalletService.getInstance();
