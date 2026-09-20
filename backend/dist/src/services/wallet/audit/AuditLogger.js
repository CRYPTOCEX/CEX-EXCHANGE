"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditLogger = exports.AuditLogger = void 0;
const console_1 = require("@b/utils/console");
const db_1 = require("@b/db");
class AuditLogger {
    constructor() { }
    static getInstance() {
        if (!AuditLogger.instance) {
            AuditLogger.instance = new AuditLogger();
        }
        return AuditLogger.instance;
    }
    async log(entry, transaction) {
        try {
            console_1.logger.info("WALLET_AUDIT", JSON.stringify({
                timestamp: new Date().toISOString(),
                ...entry,
            }));
            try {
                await db_1.models.walletAuditLog.create({
                    userId: entry.userId,
                    walletId: entry.walletId,
                    operation: entry.operation,
                    amount: entry.amount,
                    previousBalance: entry.previousBalance,
                    newBalance: entry.newBalance,
                    previousInOrder: entry.previousInOrder,
                    newInOrder: entry.newInOrder,
                    transactionId: entry.transactionId,
                    idempotencyKey: entry.idempotencyKey,
                    metadata: entry.metadata,
                }, transaction ? { transaction } : undefined);
            }
            catch (dbError) {
                console_1.logger.warn("WALLET_AUDIT_PERSIST_FAILED", `Failed to persist audit entry for ${entry.operation} (${entry.idempotencyKey}): ${dbError.message}`);
            }
        }
        catch (error) {
            console_1.logger.error("WALLET_AUDIT", `Failed to write audit log: ${error.message}`);
        }
    }
    async logWalletCreated(walletId, userId, type, currency, chains, transaction) {
        await this.log({
            operation: "WALLET_CREATED",
            walletId,
            userId,
            amount: 0,
            transactionId: null,
            idempotencyKey: `create_${type}_${userId}_${currency}`,
            metadata: { type, currency, chains },
        }, transaction);
    }
    async logCredit(walletId, userId, amount, previousBalance, newBalance, transactionId, idempotencyKey, metadata, transaction) {
        await this.log({
            operation: "CREDIT",
            walletId,
            userId,
            amount,
            previousBalance,
            newBalance,
            transactionId,
            idempotencyKey,
            metadata,
        }, transaction);
    }
    async logDebit(walletId, userId, amount, previousBalance, newBalance, transactionId, idempotencyKey, metadata, transaction) {
        await this.log({
            operation: "DEBIT",
            walletId,
            userId,
            amount,
            previousBalance,
            newBalance,
            transactionId,
            idempotencyKey,
            metadata,
        }, transaction);
    }
    async logHold(walletId, userId, amount, previousBalance, newBalance, previousInOrder, newInOrder, transactionId, idempotencyKey, metadata, transaction) {
        await this.log({
            operation: "HOLD",
            walletId,
            userId,
            amount,
            previousBalance,
            newBalance,
            previousInOrder,
            newInOrder,
            transactionId,
            idempotencyKey,
            metadata,
        }, transaction);
    }
    async logRelease(walletId, userId, amount, previousBalance, newBalance, previousInOrder, newInOrder, transactionId, idempotencyKey, metadata, transaction) {
        await this.log({
            operation: "RELEASE",
            walletId,
            userId,
            amount,
            previousBalance,
            newBalance,
            previousInOrder,
            newInOrder,
            transactionId,
            idempotencyKey,
            metadata,
        }, transaction);
    }
    async logTransferOut(walletId, userId, amount, previousBalance, newBalance, transactionId, idempotencyKey, toWalletId, fee, metadata, transaction) {
        await this.log({
            operation: "TRANSFER_OUT",
            walletId,
            userId,
            amount,
            previousBalance,
            newBalance,
            transactionId,
            idempotencyKey,
            metadata: { ...metadata, toWalletId, fee },
        }, transaction);
    }
    async logTransferIn(walletId, userId, amount, previousBalance, newBalance, transactionId, idempotencyKey, fromWalletId, metadata, transaction) {
        await this.log({
            operation: "TRANSFER_IN",
            walletId,
            userId,
            amount,
            previousBalance,
            newBalance,
            transactionId,
            idempotencyKey,
            metadata: { ...metadata, fromWalletId },
        }, transaction);
    }
    async logExecuteFromHold(walletId, userId, amount, previousInOrder, newInOrder, transactionId, idempotencyKey, metadata, transaction) {
        await this.log({
            operation: "EXECUTE_FROM_HOLD",
            walletId,
            userId,
            amount,
            previousInOrder,
            newInOrder,
            transactionId,
            idempotencyKey,
            metadata,
        }, transaction);
    }
}
exports.AuditLogger = AuditLogger;
exports.auditLogger = AuditLogger.getInstance();
