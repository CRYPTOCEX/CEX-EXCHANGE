"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditLogger = exports.AuditLogger = void 0;
const console_1 = require("@b/utils/console");
class AuditLogger {
    constructor() { }
    static getInstance() {
        if (!AuditLogger.instance) {
            AuditLogger.instance = new AuditLogger();
        }
        return AuditLogger.instance;
    }
    async log(entry) {
        try {
            console_1.logger.info("WALLET_AUDIT", JSON.stringify({
                timestamp: new Date().toISOString(),
                ...entry,
            }));
        }
        catch (error) {
            console_1.logger.error("WALLET_AUDIT", `Failed to write audit log: ${error.message}`);
        }
    }
    async logWalletCreated(walletId, userId, type, currency, chains) {
        await this.log({
            operation: "WALLET_CREATED",
            walletId,
            userId,
            amount: 0,
            transactionId: walletId,
            idempotencyKey: `create_${type}_${userId}_${currency}`,
            metadata: { type, currency, chains },
        });
    }
    async logCredit(walletId, userId, amount, previousBalance, newBalance, transactionId, idempotencyKey, metadata) {
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
        });
    }
    async logDebit(walletId, userId, amount, previousBalance, newBalance, transactionId, idempotencyKey, metadata) {
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
        });
    }
    async logHold(walletId, userId, amount, previousBalance, newBalance, previousInOrder, newInOrder, transactionId, idempotencyKey, metadata) {
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
        });
    }
    async logRelease(walletId, userId, amount, previousBalance, newBalance, previousInOrder, newInOrder, transactionId, idempotencyKey, metadata) {
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
        });
    }
    async logTransferOut(walletId, userId, amount, previousBalance, newBalance, transactionId, idempotencyKey, toWalletId, fee, metadata) {
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
        });
    }
    async logTransferIn(walletId, userId, amount, previousBalance, newBalance, transactionId, idempotencyKey, fromWalletId, metadata) {
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
        });
    }
    async logExecuteFromHold(walletId, userId, amount, previousInOrder, newInOrder, transactionId, idempotencyKey, metadata) {
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
        });
    }
}
exports.AuditLogger = AuditLogger;
exports.auditLogger = AuditLogger.getInstance();
