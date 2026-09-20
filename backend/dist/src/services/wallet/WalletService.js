"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.walletService = exports.WalletService = void 0;
exports.isIdempotencyKeyViolation = isIdempotencyKeyViolation;
exports.validateLedgerAmount = validateLedgerAmount;
exports.validateLedgerWalletStatus = validateLedgerWalletStatus;
exports.applyCredit = applyCredit;
exports.applyHold = applyHold;
exports.applyRelease = applyRelease;
exports.applyExecuteFromHold = applyExecuteFromHold;
exports.creditLedgerRow = creditLedgerRow;
exports.holdLedgerRow = holdLedgerRow;
exports.releaseLedgerRow = releaseLedgerRow;
exports.executeFromHoldLedgerRow = executeFromHoldLedgerRow;
exports.mapOperationTypeToTransactionType = mapOperationTypeToTransactionType;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const sequelize_1 = require("sequelize");
const fees_1 = require("@b/utils/fees");
const errors_1 = require("./errors");
const precision_1 = require("./utils/precision");
const AuditLogger_1 = require("./audit/AuditLogger");
const serial_1 = require("./serial");
const PrecisionCacheService_1 = require("./PrecisionCacheService");
const console_1 = require("@b/utils/console");
const LEDGER_FLOW = {
    IN: "IN",
    OUT: "OUT",
    INTERNAL: "INTERNAL",
};
const IDEMPOTENCY_INDEX_NAME = "transaction_idempotency_key";
const IDEMPOTENCY_COLUMN_NAME = "idempotencyKey";
const DUPLICATE_ENTRY_KEY = /Duplicate entry '([\s\S]*)' for key '?((.|\s)*?)'?$/;
function isIdempotencyKeyViolation(error) {
    var _a, _b, _c, _d;
    var _e, _f, _g, _h, _j;
    const e = error;
    if (!e)
        return false;
    const unique = error instanceof sequelize_1.UniqueConstraintError || e.name === "SequelizeUniqueConstraintError";
    if (!unique)
        return false;
    const names = new Set(Object.keys((_e = e.fields) !== null && _e !== void 0 ? _e : {}));
    for (const item of Array.isArray(e.errors) ? e.errors : []) {
        if (item === null || item === void 0 ? void 0 : item.path)
            names.add(String(item.path));
    }
    const message = (_h = (_g = (_f = (_a = e.parent) === null || _a === void 0 ? void 0 : _a.sqlMessage) !== null && _f !== void 0 ? _f : (_b = e.original) === null || _b === void 0 ? void 0 : _b.sqlMessage) !== null && _g !== void 0 ? _g : (_c = e.parent) === null || _c === void 0 ? void 0 : _c.message) !== null && _h !== void 0 ? _h : (_d = e.original) === null || _d === void 0 ? void 0 : _d.message;
    const match = typeof message === "string" ? message.match(DUPLICATE_ENTRY_KEY) : null;
    if (match)
        names.add((_j = String(match[2]).split(".").pop()) !== null && _j !== void 0 ? _j : "");
    return names.has(IDEMPOTENCY_INDEX_NAME) || names.has(IDEMPOTENCY_COLUMN_NAME);
}
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
        if (!idempotencyKey) {
            return { isDuplicate: false };
        }
        const existing = await db_1.models.transaction.findOne({
            where: {
                [sequelize_1.Op.or]: [
                    { id: idempotencyKey },
                    { idempotencyKey },
                ],
            },
            attributes: ["id"],
            paranoid: false,
            ...(transaction && { transaction }),
        });
        if (existing) {
            return { isDuplicate: true, existingTransactionId: existing.id };
        }
        return { isDuplicate: false };
    }
    async handleDuplicateOnCreate(error, idempotencyKey, transaction) {
        if (idempotencyKey && isIdempotencyKeyViolation(error)) {
            const existing = await db_1.models.transaction.findOne({
                where: { idempotencyKey },
                attributes: ["id"],
                paranoid: false,
                ...(transaction && { transaction }),
            });
            throw new errors_1.DuplicateOperationError(idempotencyKey, existing === null || existing === void 0 ? void 0 : existing.id);
        }
        throw error;
    }
    validateAmount(amount, operation, currency) {
        validateLedgerAmount(amount, operation, currency);
    }
    validateWalletStatus(wallet) {
        validateLedgerWalletStatus(wallet);
    }
    mapOperationTypeToTransactionType(operationType) {
        return mapOperationTypeToTransactionType(operationType);
    }
    async credit(operation) {
        this.validateAmount(operation.amount, "Credit", operation.currency);
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
            const applied = applyCredit(wallet, operation.amount, operation.currency);
            const { creditAmount, previousBalance, newBalance } = applied;
            await db_1.models.wallet.update({ balance: newBalance }, { where: { id: wallet.id }, transaction: t });
            const resolvedUserId = operation.userId || wallet.userId;
            let txRecord;
            try {
                txRecord = await db_1.models.transaction.create(creditLedgerRow(operation, resolvedUserId, wallet.id, applied), { transaction: t });
            }
            catch (error) {
                await this.handleDuplicateOnCreate(error, operation.idempotencyKey, t);
            }
            await this.auditLogger.logCredit(wallet.id, resolvedUserId, creditAmount, previousBalance, newBalance, txRecord.id, operation.idempotencyKey, operation.metadata, t);
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
        return await (0, serial_1.withWalletSerial)([(0, serial_1.walletSerialKey)(operation)], () => db_1.sequelize.transaction(executeInTransaction));
    }
    async debit(operation) {
        this.validateAmount(operation.amount, "Debit", operation.currency);
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
            let txRecord;
            try {
                txRecord = await db_1.models.transaction.create({
                    userId: resolvedUserId,
                    walletId: wallet.id,
                    type: this.mapOperationTypeToTransactionType(operation.operationType),
                    status: "COMPLETED",
                    amount: debitAmount,
                    fee: feeAmount,
                    description: operation.description,
                    referenceId: operation.referenceId,
                    idempotencyKey: operation.idempotencyKey,
                    metadata: JSON.stringify({
                        idempotencyKey: operation.idempotencyKey,
                        operationType: operation.operationType,
                        previousBalance,
                        newBalance,
                        totalDebit,
                        ...operation.metadata,
                        flow: LEDGER_FLOW.OUT,
                    }),
                }, { transaction: t });
            }
            catch (error) {
                await this.handleDuplicateOnCreate(error, operation.idempotencyKey, t);
            }
            await this.auditLogger.logDebit(wallet.id, resolvedUserId, totalDebit, previousBalance, newBalance, txRecord.id, operation.idempotencyKey, operation.metadata, t);
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
        return await (0, serial_1.withWalletSerial)([(0, serial_1.walletSerialKey)(operation)], () => db_1.sequelize.transaction(executeInTransaction));
    }
    async hold(operation) {
        this.validateAmount(operation.amount, "Hold", operation.currency);
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
            const applied = applyHold(wallet, operation.amount, operation.currency);
            const { holdAmount, previousBalance, previousInOrder, newBalance, newInOrder } = applied;
            await db_1.models.wallet.update({ balance: newBalance, inOrder: newInOrder }, { where: { id: wallet.id }, transaction: t });
            const resolvedUserId = operation.userId || wallet.userId;
            let txRecord;
            try {
                txRecord = await db_1.models.transaction.create(holdLedgerRow(operation, resolvedUserId, wallet.id, applied), { transaction: t });
            }
            catch (error) {
                await this.handleDuplicateOnCreate(error, operation.idempotencyKey, t);
            }
            await this.auditLogger.logHold(wallet.id, resolvedUserId, holdAmount, previousBalance, newBalance, previousInOrder, newInOrder, txRecord.id, operation.idempotencyKey, operation.metadata, t);
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
        return await (0, serial_1.withWalletSerial)([(0, serial_1.walletSerialKey)(operation)], () => db_1.sequelize.transaction(executeInTransaction), "hold");
    }
    async release(operation) {
        this.validateAmount(operation.amount, "Release", operation.currency);
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
            const applied = applyRelease(wallet, operation.amount, operation.currency);
            const { releaseAmount, previousBalance, previousInOrder, newBalance, newInOrder } = applied;
            await db_1.models.wallet.update({ balance: newBalance, inOrder: newInOrder }, { where: { id: wallet.id }, transaction: t });
            const resolvedUserId = operation.userId || wallet.userId;
            let txRecord;
            try {
                txRecord = await db_1.models.transaction.create(releaseLedgerRow(operation, resolvedUserId, wallet.id, applied), { transaction: t });
            }
            catch (error) {
                await this.handleDuplicateOnCreate(error, operation.idempotencyKey, t);
            }
            await this.auditLogger.logRelease(wallet.id, resolvedUserId, releaseAmount, previousBalance, newBalance, previousInOrder, newInOrder, txRecord.id, operation.idempotencyKey, operation.metadata, t);
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
        return await (0, serial_1.withWalletSerial)([(0, serial_1.walletSerialKey)(operation)], () => db_1.sequelize.transaction(executeInTransaction));
    }
    async executeFromHold(operation) {
        this.validateAmount(operation.amount, "Execute", operation.currency);
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
            const applied = applyExecuteFromHold(wallet, operation.amount, operation.fee, operation.currency);
            const { totalExecute, previousInOrder, previousBalance, newInOrder } = applied;
            await db_1.models.wallet.update({ inOrder: newInOrder }, { where: { id: wallet.id }, transaction: t });
            const resolvedUserId = operation.userId || wallet.userId;
            let txRecord;
            try {
                txRecord = await db_1.models.transaction.create(executeFromHoldLedgerRow(operation, resolvedUserId, wallet.id, applied), { transaction: t });
            }
            catch (error) {
                await this.handleDuplicateOnCreate(error, operation.idempotencyKey, t);
            }
            await this.auditLogger.logExecuteFromHold(wallet.id, resolvedUserId, totalExecute, previousInOrder, newInOrder, txRecord.id, operation.idempotencyKey, operation.metadata, t);
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
        return await (0, serial_1.withWalletSerial)([(0, serial_1.walletSerialKey)(operation)], () => db_1.sequelize.transaction(executeInTransaction));
    }
    async transfer(operation) {
        this.validateAmount(operation.amount, "Transfer", operation.fromCurrency);
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
            const fromKey = `${operation.fromUserId}|${operation.fromWalletType}|${operation.fromCurrency}`;
            const toKey = `${operation.toUserId}|${operation.toWalletType}|${operation.toCurrency}`;
            const lockFromFirst = fromKey <= toKey;
            let fromWallet;
            let toWallet;
            if (lockFromFirst) {
                fromWallet = await this.getWallet(operation.fromUserId, operation.fromWalletType, operation.fromCurrency, { transaction: t, lock: true });
                toWallet = await this.getWallet(operation.toUserId, operation.toWalletType, operation.toCurrency, { transaction: t, lock: true, createIfMissing: true });
            }
            else {
                toWallet = await this.getWallet(operation.toUserId, operation.toWalletType, operation.toCurrency, { transaction: t, lock: true, createIfMissing: true });
                fromWallet = await this.getWallet(operation.fromUserId, operation.fromWalletType, operation.fromCurrency, { transaction: t, lock: true });
            }
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
            const receiveIdempotencyKey = operation.idempotencyKey
                ? `${operation.idempotencyKey}_receive`
                : operation.idempotencyKey;
            let fromTx;
            try {
                fromTx = await db_1.models.transaction.create({
                    userId: operation.fromUserId,
                    walletId: fromWallet.id,
                    type: "OUTGOING_TRANSFER",
                    status: "COMPLETED",
                    amount: transferAmount,
                    fee: feeAmount,
                    description: operation.description,
                    idempotencyKey: operation.idempotencyKey,
                    metadata: JSON.stringify({
                        idempotencyKey: operation.idempotencyKey,
                        previousBalance: fromBalance,
                        newBalance: newFromBalance,
                        toWalletId: toWallet.id,
                        toUserId: operation.toUserId,
                        exchangeRate,
                        ...operation.metadata,
                        flow: LEDGER_FLOW.OUT,
                    }),
                }, { transaction: t });
            }
            catch (error) {
                await this.handleDuplicateOnCreate(error, operation.idempotencyKey, t);
            }
            let toTx;
            try {
                toTx = await db_1.models.transaction.create({
                    userId: operation.toUserId,
                    walletId: toWallet.id,
                    type: "INCOMING_TRANSFER",
                    status: "COMPLETED",
                    amount: receiveAmount,
                    fee: 0,
                    description: operation.description,
                    idempotencyKey: receiveIdempotencyKey,
                    metadata: JSON.stringify({
                        idempotencyKey: receiveIdempotencyKey,
                        previousBalance: toBalance,
                        newBalance: newToBalance,
                        fromWalletId: fromWallet.id,
                        fromUserId: operation.fromUserId,
                        exchangeRate,
                        ...operation.metadata,
                        flow: LEDGER_FLOW.IN,
                    }),
                }, { transaction: t });
            }
            catch (error) {
                await this.handleDuplicateOnCreate(error, receiveIdempotencyKey, t);
            }
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
            await this.auditLogger.logTransferOut(fromWallet.id, operation.fromUserId, totalDebit, fromBalance, newFromBalance, fromTx.id, operation.idempotencyKey, toWallet.id, feeAmount, operation.metadata, t);
            await this.auditLogger.logTransferIn(toWallet.id, operation.toUserId, receiveAmount, toBalance, newToBalance, toTx.id, `${operation.idempotencyKey}_receive`, fromWallet.id, operation.metadata, t);
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
        return await (0, serial_1.withWalletSerial)([(0, serial_1.walletSerialKey)({ userId: operation.fromUserId, walletType: operation.fromWalletType, currency: operation.fromCurrency }), (0, serial_1.walletSerialKey)({ userId: operation.toUserId, walletType: operation.toWalletType, currency: operation.toCurrency })], () => db_1.sequelize.transaction(executeInTransaction));
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
        const wallet = await this.getWalletById(walletId);
        const transactions = await db_1.models.transaction.findAll({
            where: { walletId, status: "COMPLETED" },
            order: [
                ["createdAt", "ASC"],
                ["id", "ASC"],
            ],
        });
        let expectedBalance = 0;
        let replayed = 0;
        let unclassified = 0;
        for (const tx of transactions) {
            let metadata = {};
            try {
                metadata =
                    typeof tx.metadata === "string"
                        ? JSON.parse(tx.metadata)
                        : tx.metadata || {};
            }
            catch (_a) {
                metadata = {};
            }
            const previous = Number(metadata.previousBalance);
            const next = Number(metadata.newBalance);
            if (Number.isFinite(previous) && Number.isFinite(next)) {
                expectedBalance = (0, precision_1.safeAdd)(expectedBalance, (0, precision_1.safeSubtract)(next, previous, wallet.currency), wallet.currency);
                replayed++;
                continue;
            }
            if (Number.isFinite(Number(metadata.previousInOrder)) &&
                Number.isFinite(Number(metadata.newInOrder))) {
                replayed++;
                continue;
            }
            unclassified++;
        }
        const actualBalance = wallet.balance;
        const discrepancy = Math.abs(expectedBalance - actualBalance);
        return {
            isValid: discrepancy < 0.00000001 && unclassified === 0,
            expectedBalance: (0, precision_1.roundToPrecision)(expectedBalance, wallet.currency),
            actualBalance,
            discrepancy,
            replayedTransactions: replayed,
            unclassifiedTransactions: unclassified,
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
        this.validateAmount(operation.amount, "Eco Credit", operation.currency);
        const executeInTransaction = async (t) => {
            var _a, _b;
            var _c;
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
            const untracked = [];
            if (addresses[chain]) {
                previousChainBalance = await this.updateBalancePrecision(parseFloat(((_a = addresses[chain].balance) === null || _a === void 0 ? void 0 : _a.toString()) || "0"), currency, chain);
                newChainBalance = await this.updateBalancePrecision(previousChainBalance + precisionAmount, currency, chain);
                addresses[chain].balance = newChainBalance;
            }
            else {
                untracked.push("address");
                console_1.logger.warn("WALLET_ECO_CREDIT", `Crediting ${precisionAmount} ${currency} to wallet=${wallet.id} user=${operation.userId} on chain=${chain}, which has no address entry. ` +
                    `wallet.balance is updated; the per-chain address tracker is not. action=eco_credit_missing_address_entry`);
            }
            const previousBalance = wallet.balance;
            const newBalance = await this.updateBalancePrecision(previousBalance + precisionAmount, currency, chain);
            await db_1.models.wallet.update({
                balance: newBalance,
                address: addresses,
            }, { where: { id: wallet.id }, transaction: t });
            const walletData = await db_1.models.walletData.findOne({
                where: { walletId: wallet.id, chain },
                lock: sequelize_1.Transaction.LOCK.UPDATE,
                transaction: t,
            });
            if (walletData) {
                const currentWalletDataBalance = parseFloat(((_b = walletData.balance) === null || _b === void 0 ? void 0 : _b.toString()) || "0");
                const newWalletDataBalance = await this.updateBalancePrecision(currentWalletDataBalance + precisionAmount, currency, chain);
                await db_1.models.walletData.update({ balance: newWalletDataBalance }, { where: { walletId: wallet.id, chain }, transaction: t });
            }
            else {
                const siblingWalletData = await db_1.models.walletData.findOne({
                    where: { walletId: wallet.id },
                    transaction: t,
                });
                if (siblingWalletData && siblingWalletData.data) {
                    console_1.logger.warn("WALLET_ECO_CREDIT", `Lazy-creating missing walletData row for wallet=${wallet.id} user=${operation.userId} chain=${chain} amount=${precisionAmount} action=eco_credit_lazy_walletData_create`);
                    await db_1.models.walletData.create({
                        walletId: wallet.id,
                        currency,
                        chain,
                        balance: await this.updateBalancePrecision(precisionAmount, currency, chain),
                        index: (_c = siblingWalletData.index) !== null && _c !== void 0 ? _c : 0,
                        data: siblingWalletData.data,
                    }, { transaction: t });
                }
                else {
                    untracked.push("walletData");
                    console_1.logger.error("WALLET_ECO_CREDIT", `Credited ${precisionAmount} ${currency} to wallet=${wallet.id} user=${operation.userId} chain=${chain} but the walletData row is missing and no sibling exists to seed one. ` +
                        `wallet.balance (canonical) is correct; the per-chain tracker is now behind by this amount. action=eco_credit_walletData_unreachable`);
                }
            }
            const fromAddress = Array.isArray(operation.fromAddress)
                ? operation.fromAddress[0] || "Unknown"
                : operation.fromAddress || "Unknown";
            let txRecord;
            try {
                txRecord = await db_1.models.transaction.create({
                    userId: operation.userId,
                    walletId: wallet.id,
                    type: this.mapOperationTypeToTransactionType(operation.operationType),
                    status: "COMPLETED",
                    amount: precisionAmount,
                    fee: operation.fee || 0,
                    description: operation.description || `Deposit of ${precisionAmount} ${operation.currency} from ${fromAddress}`,
                    trxId: operation.txHash,
                    referenceId: operation.referenceId,
                    idempotencyKey: operation.idempotencyKey,
                    metadata: JSON.stringify({
                        idempotencyKey: operation.idempotencyKey,
                        chain,
                        currency: operation.currency,
                        previousBalance,
                        newBalance,
                        previousChainBalance,
                        newChainBalance,
                        ...(untracked.length > 0 && { untrackedStores: untracked }),
                        from: operation.fromAddress,
                        to: operation.toAddress,
                        ...operation.metadata,
                        flow: LEDGER_FLOW.IN,
                    }),
                }, { transaction: t });
            }
            catch (error) {
                await this.handleDuplicateOnCreate(error, operation.idempotencyKey, t);
            }
            await this.auditLogger.logCredit(wallet.id, operation.userId, precisionAmount, previousBalance, newBalance, txRecord.id, operation.idempotencyKey, {
                chain,
                previousChainBalance,
                newChainBalance,
                ...(untracked.length > 0 && { untrackedStores: untracked }),
                ...operation.metadata,
            }, t);
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
        return await (0, serial_1.withWalletSerial)([(0, serial_1.walletSerialKey)({ walletId: operation.walletId })], () => db_1.sequelize.transaction(executeInTransaction));
    }
    async ecoDebit(operation) {
        this.validateAmount(operation.amount, "Eco Debit", operation.currency);
        const executeInTransaction = async (t) => {
            var _a, _b;
            var _c;
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
            let previousWalletDataBalance = 0;
            let newWalletDataBalance = 0;
            if (walletData) {
                previousWalletDataBalance = parseFloat(((_b = walletData.balance) === null || _b === void 0 ? void 0 : _b.toString()) || "0");
                newWalletDataBalance = await this.updateBalancePrecision(previousWalletDataBalance - precisionAmount, currency, chain);
                if (newWalletDataBalance < 0) {
                    newWalletDataBalance = 0;
                }
                await db_1.models.walletData.update({ balance: newWalletDataBalance }, { where: { walletId: wallet.id, chain }, transaction: t });
            }
            else {
                const siblingWalletData = await db_1.models.walletData.findOne({
                    where: { walletId: wallet.id },
                    transaction: t,
                });
                if (siblingWalletData && siblingWalletData.data) {
                    console_1.logger.warn("WALLET_ECO_DEBIT", `Lazy-creating missing walletData row for wallet=${wallet.id} user=${operation.userId} chain=${chain} amount=${precisionAmount} action=eco_debit_lazy_walletData_create`);
                    await db_1.models.walletData.create({
                        walletId: wallet.id,
                        currency,
                        chain,
                        balance: 0,
                        index: (_c = siblingWalletData.index) !== null && _c !== void 0 ? _c : 0,
                        data: siblingWalletData.data,
                    }, { transaction: t });
                }
                else {
                    console_1.logger.error("WALLET_ECO_DEBIT", `Cannot debit wallet=${wallet.id} user=${operation.userId} chain=${chain} amount=${precisionAmount}: walletData row missing and no sibling walletData available to seed lazy create. Aborting to avoid canonical/per-chain balance drift.`);
                    throw (0, error_1.createError)({
                        statusCode: 500,
                        message: `Wallet data for chain ${chain} is missing and cannot be safely created. Please contact support.`,
                    });
                }
            }
            const chainShortfall = await this.updateBalancePrecision(Math.max(0, precisionAmount - (previousChainBalance - newChainBalance)), currency, chain);
            const walletDataShortfall = await this.updateBalancePrecision(Math.max(0, precisionAmount - (previousWalletDataBalance - newWalletDataBalance)), currency, chain);
            let txRecord;
            try {
                txRecord = await db_1.models.transaction.create({
                    userId: operation.userId,
                    walletId: wallet.id,
                    type: this.mapOperationTypeToTransactionType(operation.operationType),
                    status: "COMPLETED",
                    amount: precisionAmount,
                    fee: operation.fee || 0,
                    description: operation.description ||
                        `Withdrawal of ${precisionAmount} ${operation.currency}`,
                    referenceId: operation.referenceId,
                    idempotencyKey: operation.idempotencyKey,
                    metadata: JSON.stringify({
                        idempotencyKey: operation.idempotencyKey,
                        chain,
                        currency: operation.currency,
                        previousBalance,
                        newBalance,
                        previousChainBalance,
                        newChainBalance,
                        ...operation.metadata,
                        chainShortfall,
                        walletDataShortfall,
                        flow: LEDGER_FLOW.OUT,
                    }),
                }, { transaction: t });
            }
            catch (error) {
                await this.handleDuplicateOnCreate(error, operation.idempotencyKey, t);
            }
            await this.auditLogger.logDebit(wallet.id, operation.userId, precisionAmount, previousBalance, newBalance, txRecord.id, operation.idempotencyKey, { chain, previousChainBalance, newChainBalance, ...operation.metadata }, t);
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
        return await (0, serial_1.withWalletSerial)([(0, serial_1.walletSerialKey)({ walletId: operation.walletId })], () => db_1.sequelize.transaction(executeInTransaction));
    }
    async findDebitShortfall(walletId, chain, currency, amount, t) {
        var _a;
        var _b, _c, _d;
        const none = { chain: 0, walletData: 0 };
        if (!chain)
            return none;
        const rows = await db_1.models.transaction.findAll({
            where: {
                walletId,
                type: this.mapOperationTypeToTransactionType("ECO_WITHDRAW"),
                status: "COMPLETED",
            },
            order: [["createdAt", "DESC"]],
            limit: 50,
            transaction: t,
        });
        let exact = null;
        let latest = null;
        for (const row of rows) {
            let meta;
            try {
                meta = typeof row.metadata === "string" ? JSON.parse(row.metadata) : row.metadata;
            }
            catch (_e) {
                continue;
            }
            if (!meta || meta.chain !== chain || meta.flow !== LEDGER_FLOW.OUT)
                continue;
            if (meta.currency && meta.currency !== currency)
                continue;
            const debited = parseFloat(String((_b = row.amount) !== null && _b !== void 0 ? _b : 0));
            if (!Number.isFinite(debited) || debited <= 0)
                continue;
            let chainShortfall = Number(meta.chainShortfall);
            if (!Number.isFinite(chainShortfall)) {
                const taken = Number(meta.previousChainBalance) - Number(meta.newChainBalance);
                if (!Number.isFinite(taken))
                    continue;
                chainShortfall = debited - taken;
            }
            let walletDataShortfall = Number(meta.walletDataShortfall);
            if (!Number.isFinite(walletDataShortfall))
                walletDataShortfall = chainShortfall;
            const shortfall = {
                chain: Math.min(Math.max(0, chainShortfall), amount),
                walletData: Math.min(Math.max(0, walletDataShortfall), amount),
            };
            const at = new Date((_c = row.createdAt) !== null && _c !== void 0 ? _c : 0).getTime();
            if (!latest || at > latest.at)
                latest = { at, shortfall };
            if (Math.abs(debited - amount) <= Math.max(1e-9, Math.abs(amount) * 1e-12)) {
                if (!exact || at > exact.at)
                    exact = { at, shortfall };
            }
        }
        return (_d = (_a = (exact !== null && exact !== void 0 ? exact : latest)) === null || _a === void 0 ? void 0 : _a.shortfall) !== null && _d !== void 0 ? _d : none;
    }
    async ecoRefund(operation) {
        this.validateAmount(operation.amount, "Eco Refund", operation.currency);
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
            const shortfall = await this.findDebitShortfall(wallet.id, chain, currency, precisionAmount, t);
            let previousChainBalance = 0;
            let newChainBalance = 0;
            if (chain && addresses[chain]) {
                previousChainBalance = await this.updateBalancePrecision(parseFloat(((_a = addresses[chain].balance) === null || _a === void 0 ? void 0 : _a.toString()) || "0"), currency, chain);
                newChainBalance = await this.updateBalancePrecision(previousChainBalance + (precisionAmount - shortfall.chain), currency, chain);
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
                    const newWalletDataBalance = await this.updateBalancePrecision(currentWalletDataBalance + (precisionAmount - shortfall.walletData), currency, chain);
                    await db_1.models.walletData.update({ balance: newWalletDataBalance }, { where: { walletId: wallet.id, chain }, transaction: t });
                }
            }
            let txRecord;
            try {
                txRecord = await db_1.models.transaction.create({
                    userId: operation.userId,
                    walletId: wallet.id,
                    type: this.mapOperationTypeToTransactionType(operation.operationType),
                    status: "COMPLETED",
                    amount: precisionAmount,
                    fee: operation.fee || 0,
                    description: operation.description ||
                        `Refund of ${precisionAmount} ${operation.currency}`,
                    referenceId: operation.referenceId,
                    idempotencyKey: operation.idempotencyKey,
                    metadata: JSON.stringify({
                        idempotencyKey: operation.idempotencyKey,
                        chain,
                        currency: operation.currency,
                        previousBalance,
                        newBalance,
                        previousChainBalance,
                        newChainBalance,
                        refund: true,
                        ...operation.metadata,
                        chainShortfall: shortfall.chain,
                        walletDataShortfall: shortfall.walletData,
                        flow: LEDGER_FLOW.IN,
                    }),
                }, { transaction: t });
            }
            catch (error) {
                await this.handleDuplicateOnCreate(error, operation.idempotencyKey, t);
            }
            await this.auditLogger.logCredit(wallet.id, operation.userId, precisionAmount, previousBalance, newBalance, txRecord.id, operation.idempotencyKey, { chain, previousChainBalance, newChainBalance, refund: true, ...operation.metadata }, t);
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
        return await (0, serial_1.withWalletSerial)([(0, serial_1.walletSerialKey)({ walletId: operation.walletId })], () => db_1.sequelize.transaction(executeInTransaction));
    }
    async ecoChainTransfer(operation) {
        this.validateAmount(operation.fromAmount, "Eco Chain Transfer (from)", operation.currency);
        this.validateAmount(operation.toAmount, "Eco Chain Transfer (to)", operation.currency);
        if (!operation.idempotencyKey) {
            throw new errors_1.WalletError("ecoChainTransfer requires an idempotencyKey", "IDEMPOTENCY_KEY_REQUIRED", 400, { fromWalletId: operation.fromWalletId, toWalletId: operation.toWalletId });
        }
        const executeInTransaction = async (t) => {
            var _a;
            const { currency, chain, fromWalletId, toWalletId, fromAmount, toAmount, idempotencyKey } = operation;
            const { isDuplicate } = await this.checkIdempotency(idempotencyKey, t);
            if (isDuplicate) {
                console.warn(`[WALLET] Duplicate ecoChainTransfer detected: ${idempotencyKey}`);
                return {
                    success: true,
                    chain,
                    from: { walletId: fromWalletId, previousChainBalance: 0, newChainBalance: 0 },
                    to: { walletId: toWalletId, previousChainBalance: 0, newChainBalance: 0 },
                    timestamp: new Date(),
                };
            }
            const lockTracker = (walletId) => db_1.models.walletData.findOne({
                where: { walletId, currency, chain },
                lock: sequelize_1.Transaction.LOCK.UPDATE,
                transaction: t,
            });
            let fromWalletData;
            let toWalletData;
            if (fromWalletId <= toWalletId) {
                fromWalletData = await lockTracker(fromWalletId);
                toWalletData = await lockTracker(toWalletId);
            }
            else {
                toWalletData = await lockTracker(toWalletId);
                fromWalletData = await lockTracker(fromWalletId);
            }
            if (!fromWalletData) {
                throw new errors_1.WalletDataNotFoundError(fromWalletId, chain);
            }
            const untracked = [];
            if (!toWalletData) {
                const siblingWalletData = await db_1.models.walletData.findOne({
                    where: { walletId: toWalletId },
                    transaction: t,
                });
                if (!siblingWalletData || !siblingWalletData.data) {
                    console_1.logger.error("WALLET_ECO_CHAIN_TRANSFER", `Refusing to transfer ${toAmount} ${currency} on chain=${chain} into wallet=${toWalletId}: ` +
                        `it has no walletData row for the chain and no sibling row to seed one from. ` +
                        `action=eco_chain_transfer_receiver_untrackable`);
                    throw new errors_1.WalletDataNotFoundError(toWalletId, chain);
                }
                console_1.logger.warn("WALLET_ECO_CHAIN_TRANSFER", `Lazy-creating missing walletData row for wallet=${toWalletId} chain=${chain} ` +
                    `action=eco_chain_transfer_lazy_walletData_create`);
                toWalletData = await db_1.models.walletData.create({
                    walletId: toWalletId,
                    currency,
                    chain,
                    balance: 0,
                    index: (_a = siblingWalletData.index) !== null && _a !== void 0 ? _a : 0,
                    data: siblingWalletData.data,
                }, { transaction: t });
            }
            const fromPreviousChainBalance = await this.updateBalancePrecision(parseFloat(String(fromWalletData.balance)) || 0, currency, chain);
            const moved = await this.updateBalancePrecision(Math.min(fromAmount, Math.max(0, fromPreviousChainBalance)), currency, chain);
            const trackerShortfall = await this.updateBalancePrecision(Math.max(0, fromAmount - moved), currency, chain);
            if (trackerShortfall > 0) {
                console_1.logger.error("WALLET_ECO_CHAIN_TRANSFER", `Sender wallet=${fromWalletId} chain=${chain} tracker holds ${fromPreviousChainBalance} ` +
                    `${currency} against a transfer of ${fromAmount}; moving ${moved} and recording a ` +
                    `tracker shortfall of ${trackerShortfall}. wallet.balance (canonical) is unaffected. ` +
                    `action=eco_chain_transfer_tracker_shortfall`);
            }
            const received = await this.updateBalancePrecision(Math.min(toAmount, moved), currency, chain);
            const fromNewChainBalance = await this.updateBalancePrecision(fromPreviousChainBalance - moved, currency, chain);
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
            if (moved > 0) {
                await ledgerService.updateLedger({
                    walletId: fromWalletId,
                    index: fromWalletData.index,
                    currency,
                    chain,
                    amount: moved,
                    transaction: t,
                });
            }
            const toPreviousChainBalance = await this.updateBalancePrecision(parseFloat(String(toWalletData.balance)) || 0, currency, chain);
            const toNewChainBalance = await this.updateBalancePrecision(toPreviousChainBalance + received, currency, chain);
            await db_1.models.walletData.update({ balance: toNewChainBalance }, { where: { id: toWalletData.id }, transaction: t });
            const toWalletRecord = await db_1.models.wallet.findOne({
                where: { id: toWalletId },
                transaction: t,
            });
            if (!toWalletRecord) {
                throw new errors_1.WalletNotFoundError(toWalletId);
            }
            const toAddresses = this.parseAddressJson(toWalletRecord.address);
            if (toAddresses[chain]) {
                toAddresses[chain].balance = toNewChainBalance;
                await db_1.models.wallet.update({ address: toAddresses }, { where: { id: toWalletId }, transaction: t });
            }
            else {
                untracked.push("address");
                console_1.logger.warn("WALLET_ECO_CHAIN_TRANSFER", `Receiver wallet=${toWalletId} has no address entry for chain=${chain}; walletData is ` +
                    `updated, the address-map tracker is not. action=eco_chain_transfer_missing_address_entry`);
            }
            if (received > 0) {
                await ledgerService.updateLedger({
                    walletId: toWalletId,
                    index: toWalletData.index,
                    currency,
                    chain,
                    amount: -received,
                    transaction: t,
                });
            }
            let txRecord;
            try {
                txRecord = await db_1.models.transaction.create({
                    userId: toWalletRecord.userId,
                    walletId: toWalletId,
                    type: "INCOMING_TRANSFER",
                    status: "COMPLETED",
                    amount: toAmount,
                    fee: 0,
                    description: `ECO chain transfer: ${fromWalletId} -> ${toWalletId}`,
                    referenceId: idempotencyKey,
                    idempotencyKey,
                    metadata: JSON.stringify({
                        idempotencyKey,
                        type: "ECO_CHAIN_TRANSFER",
                        chain,
                        fromWalletId,
                        toWalletId,
                        fromAmount,
                        toAmount,
                        trackerMoved: moved,
                        trackerReceived: received,
                        ...(trackerShortfall > 0 ? { trackerShortfall } : {}),
                        ...(untracked.length ? { untracked } : {}),
                        ...operation.metadata,
                        flow: LEDGER_FLOW.IN,
                    }),
                }, { transaction: t });
            }
            catch (error) {
                await this.handleDuplicateOnCreate(error, idempotencyKey, t);
            }
            await this.auditLogger.logCredit(toWalletId, toWalletRecord.userId, received, toPreviousChainBalance, toNewChainBalance, txRecord.id, idempotencyKey, {
                type: "ECO_CHAIN_TRANSFER",
                chain,
                fromWalletId,
                toWalletId,
                fromAmount,
                toAmount,
                trackerMoved: moved,
                trackerReceived: received,
                ...(trackerShortfall > 0 ? { trackerShortfall } : {}),
                ...(untracked.length ? { untracked } : {}),
                ...operation.metadata,
            }, t);
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
                transactionId: txRecord.id,
                ...(trackerShortfall > 0 ? { trackerShortfall } : {}),
                timestamp: new Date(),
            };
        };
        if (operation.transaction) {
            return executeInTransaction(operation.transaction);
        }
        return await (0, serial_1.withWalletSerial)([(0, serial_1.walletSerialKey)({ walletId: operation.fromWalletId }), (0, serial_1.walletSerialKey)({ walletId: operation.toWalletId })], () => db_1.sequelize.transaction(executeInTransaction));
    }
}
exports.WalletService = WalletService;
let walletServiceInstance;
const resolveWalletService = () => (walletServiceInstance !== null && walletServiceInstance !== void 0 ? walletServiceInstance : (walletServiceInstance = WalletService.getInstance()));
exports.walletService = new Proxy(Object.create(WalletService.prototype), {
    get: (_target, property, receiver) => Reflect.get(resolveWalletService(), property, receiver),
    set: (_target, property, value) => Reflect.set(resolveWalletService(), property, value),
    has: (_target, property) => Reflect.has(resolveWalletService(), property),
    deleteProperty: (_target, property) => Reflect.deleteProperty(resolveWalletService(), property),
    defineProperty: (_target, property, descriptor) => Reflect.defineProperty(resolveWalletService(), property, descriptor),
    ownKeys: () => Reflect.ownKeys(resolveWalletService()),
    getOwnPropertyDescriptor: (_target, property) => {
        const descriptor = Reflect.getOwnPropertyDescriptor(resolveWalletService(), property);
        return descriptor && { ...descriptor, configurable: true };
    },
});
function validateLedgerAmount(amount, operation, currency) {
    if (amount <= 0) {
        throw new errors_1.InvalidAmountError(amount, `${operation} amount must be positive`);
    }
    if (!isFinite(amount)) {
        throw new errors_1.InvalidAmountError(amount, "Amount must be a finite number");
    }
    if (currency && (0, precision_1.roundToPrecision)(amount, currency) === 0) {
        throw new errors_1.InvalidAmountError(amount, `${operation} amount ${amount} is below the smallest unit ${currency} can ` +
            `represent, so it would move no money. Send an amount of at least one ` +
            `unit at ${currency}'s precision.`);
    }
}
function validateLedgerWalletStatus(wallet) {
    if (!wallet.status) {
        throw new errors_1.WalletDisabledError(wallet.id);
    }
}
function applyCredit(wallet, amount, currency) {
    const creditAmount = (0, precision_1.roundToPrecision)(amount, currency);
    const previousBalance = wallet.balance;
    const newBalance = (0, precision_1.safeAdd)(previousBalance, creditAmount, currency);
    return { creditAmount, previousBalance, newBalance };
}
function applyHold(wallet, amount, currency) {
    const holdAmount = (0, precision_1.roundToPrecision)(amount, currency);
    const previousBalance = wallet.balance;
    const previousInOrder = wallet.inOrder;
    if (previousBalance < holdAmount) {
        throw new errors_1.InsufficientFundsError(previousBalance, holdAmount, currency);
    }
    const newBalance = (0, precision_1.safeSubtract)(previousBalance, holdAmount, currency);
    const newInOrder = (0, precision_1.safeAdd)(previousInOrder, holdAmount, currency);
    if (newBalance < 0) {
        throw new errors_1.NegativeBalanceError(wallet.id, newBalance);
    }
    return { holdAmount, previousBalance, previousInOrder, newBalance, newInOrder };
}
function applyRelease(wallet, amount, currency) {
    const releaseAmount = (0, precision_1.roundToPrecision)(amount, currency);
    const previousBalance = wallet.balance;
    const previousInOrder = wallet.inOrder;
    if (previousInOrder < releaseAmount) {
        throw new errors_1.InsufficientHeldFundsError(previousInOrder, releaseAmount, currency);
    }
    const newBalance = (0, precision_1.safeAdd)(previousBalance, releaseAmount, currency);
    const newInOrder = (0, precision_1.safeSubtract)(previousInOrder, releaseAmount, currency);
    if (newInOrder < 0) {
        throw new errors_1.NegativeInOrderError(wallet.id, newInOrder);
    }
    return { releaseAmount, previousBalance, previousInOrder, newBalance, newInOrder };
}
function applyExecuteFromHold(wallet, amount, fee, currency) {
    const executeAmount = (0, precision_1.roundToPrecision)(amount, currency);
    const feeAmount = (0, precision_1.roundToPrecision)(fee || 0, currency);
    const totalExecute = (0, precision_1.safeAdd)(executeAmount, feeAmount, currency);
    const previousInOrder = wallet.inOrder;
    const previousBalance = wallet.balance;
    if (previousInOrder < totalExecute) {
        throw new errors_1.InsufficientHeldFundsError(previousInOrder, totalExecute, currency);
    }
    const newInOrder = (0, precision_1.safeSubtract)(previousInOrder, totalExecute, currency);
    if (newInOrder < 0) {
        throw new errors_1.NegativeInOrderError(wallet.id, newInOrder);
    }
    return { executeAmount, feeAmount, totalExecute, previousBalance, previousInOrder, newInOrder };
}
function creditLedgerRow(operation, userId, walletId, applied) {
    const { creditAmount, previousBalance, newBalance } = applied;
    return {
        userId,
        walletId,
        type: mapOperationTypeToTransactionType(operation.operationType),
        status: "COMPLETED",
        amount: creditAmount,
        fee: operation.fee || 0,
        description: operation.description,
        referenceId: operation.referenceId,
        idempotencyKey: operation.idempotencyKey,
        metadata: JSON.stringify({
            idempotencyKey: operation.idempotencyKey,
            operationType: operation.operationType,
            previousBalance,
            newBalance,
            ...operation.metadata,
            flow: LEDGER_FLOW.IN,
        }),
    };
}
function holdLedgerRow(operation, userId, walletId, applied) {
    const { holdAmount, previousBalance, newBalance, previousInOrder, newInOrder } = applied;
    return {
        userId,
        walletId,
        type: mapOperationTypeToTransactionType(operation.operationType || "HOLD"),
        status: "COMPLETED",
        amount: holdAmount,
        fee: 0,
        description: operation.reason,
        idempotencyKey: operation.idempotencyKey,
        metadata: JSON.stringify({
            idempotencyKey: operation.idempotencyKey,
            operationType: operation.operationType || "HOLD",
            previousBalance,
            newBalance,
            previousInOrder,
            newInOrder,
            expiresAt: operation.expiresAt,
            ...operation.metadata,
            flow: LEDGER_FLOW.INTERNAL,
        }),
    };
}
function releaseLedgerRow(operation, userId, walletId, applied) {
    const { releaseAmount, previousBalance, newBalance, previousInOrder, newInOrder } = applied;
    return {
        userId,
        walletId,
        type: mapOperationTypeToTransactionType(operation.operationType || "RELEASE"),
        status: "COMPLETED",
        amount: releaseAmount,
        fee: 0,
        description: operation.reason,
        idempotencyKey: operation.idempotencyKey,
        metadata: JSON.stringify({
            idempotencyKey: operation.idempotencyKey,
            operationType: operation.operationType || "RELEASE",
            previousBalance,
            newBalance,
            previousInOrder,
            newInOrder,
            ...operation.metadata,
            flow: LEDGER_FLOW.INTERNAL,
        }),
    };
}
function executeFromHoldLedgerRow(operation, userId, walletId, applied) {
    const { executeAmount, feeAmount, previousInOrder, newInOrder } = applied;
    return {
        userId,
        walletId,
        type: mapOperationTypeToTransactionType(operation.operationType),
        status: "COMPLETED",
        amount: executeAmount,
        fee: feeAmount,
        description: operation.description,
        referenceId: operation.referenceId,
        idempotencyKey: operation.idempotencyKey,
        metadata: JSON.stringify({
            idempotencyKey: operation.idempotencyKey,
            operationType: operation.operationType,
            previousInOrder,
            newInOrder,
            ...operation.metadata,
            flow: LEDGER_FLOW.OUT,
        }),
    };
}
const OPERATION_TYPE_TO_TRANSACTION_TYPE = {
    DEPOSIT: "DEPOSIT",
    WITHDRAW: "WITHDRAW",
    INCOMING_TRANSFER: "INCOMING_TRANSFER",
    OUTGOING_TRANSFER: "OUTGOING_TRANSFER",
    PAYMENT: "PAYMENT",
    REFUND: "REFUND",
    BINARY_ORDER: "BINARY_ORDER",
    EXCHANGE_ORDER: "EXCHANGE_ORDER",
    FUTURES_ORDER: "FUTURES_ORDER",
    INVESTMENT: "INVESTMENT",
    INVESTMENT_ROI: "INVESTMENT_ROI",
    AI_INVESTMENT: "AI_INVESTMENT",
    AI_INVESTMENT_ROI: "AI_INVESTMENT_ROI",
    INVOICE: "INVOICE",
    FOREX_DEPOSIT: "FOREX_DEPOSIT",
    FOREX_WITHDRAW: "FOREX_WITHDRAW",
    FX_TRADING_DEPOSIT: "FX_TRADING_DEPOSIT",
    FX_TRADING_WITHDRAW: "FX_TRADING_WITHDRAW",
    FX_TRADING_WITHDRAW_REFUND: "FX_TRADING_DEPOSIT",
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
    ECOMMERCE_PURCHASE: "ECOMMERCE_PURCHASE",
    BINARY_ORDER_WIN: "BINARY_ORDER",
    BINARY_ORDER_LOSS: "BINARY_ORDER",
    HOLD: "EXCHANGE_ORDER",
    RELEASE: "EXCHANGE_ORDER",
    TRADE_DEBIT: "EXCHANGE_ORDER",
    TRADE_CREDIT: "EXCHANGE_ORDER",
    EXCHANGE_ORDER_FILL: "EXCHANGE_ORDER",
    EXCHANGE_ORDER_CANCEL: "EXCHANGE_ORDER",
    TRANSFER_OUT: "OUTGOING_TRANSFER",
    TRANSFER_IN: "INCOMING_TRANSFER",
    ADMIN_ADJUSTMENT_CREDIT: "DEPOSIT",
    ADMIN_ADJUSTMENT_DEBIT: "WITHDRAW",
    ADMIN_ADJUSTMENT: "DEPOSIT",
    TRADING_FEE: "TRADING_FEE",
    PLATFORM_FEE: "PLATFORM_FEE",
    PLATFORM_LOSS: "PLATFORM_LOSS",
    ORDER_PASSTHROUGH: "ORDER_PASSTHROUGH",
    GATEWAY_PAYMENT: "GATEWAY_PAYMENT",
    MARKETPLACE_PURCHASE: "MARKETPLACE_PURCHASE",
    MARKETPLACE_SALE: "MARKETPLACE_SALE",
    FEE: "PLATFORM_FEE",
    ECO_FEE: "PLATFORM_FEE",
    REFUND_WITHDRAWAL: "REFUND",
    REFUND_TRANSFER: "REFUND",
    ADJUSTMENT: "DEPOSIT",
    STAKING_DEPOSIT: "STAKING",
    STAKING_WITHDRAW: "STAKING",
    ECO_DEPOSIT: "DEPOSIT",
    ECO_WITHDRAW: "WITHDRAW",
    ECO_REFUND: "REFUND",
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
    P2P_OFFER_PAUSE: "P2P_OFFER_TRANSFER",
    P2P_OFFER_INCREASE: "P2P_OFFER_TRANSFER",
    P2P_OFFER_DECREASE: "P2P_OFFER_TRANSFER",
    P2P_ADMIN_OFFER_DISABLE: "P2P_OFFER_TRANSFER",
    P2P_ADMIN_OFFER_REJECT: "P2P_OFFER_TRANSFER",
    P2P_ADMIN_TRADE_CANCEL: "P2P_TRADE",
};
function mapOperationTypeToTransactionType(operationType) {
    const mapped = OPERATION_TYPE_TO_TRANSACTION_TYPE[operationType];
    if (!mapped) {
        console_1.logger.warn("WALLET", `Unmapped wallet operationType "${operationType}" — recording the ledger row as PAYMENT. Add it to mapOperationTypeToTransactionType.`);
    }
    return (mapped || "PAYMENT");
}
