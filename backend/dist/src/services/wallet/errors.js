"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UtxoError = exports.LedgerError = exports.TransferError = exports.NoActiveTokensError = exports.NetworkNotConfiguredError = exports.WalletDataNotFoundError = exports.EncryptionError = exports.ChainServiceUnavailableError = exports.AddressGenerationError = exports.MasterWalletExistsError = exports.MasterWalletNotFoundError = exports.WalletExistsError = exports.InvalidAmountError = exports.InvalidWalletTypeError = exports.WalletDisabledError = exports.NegativeInOrderError = exports.InsufficientHeldFundsError = exports.NegativeBalanceError = exports.PrecisionError = exports.ConcurrencyError = exports.DuplicateOperationError = exports.WalletNotFoundError = exports.InsufficientFundsError = exports.WalletError = void 0;
exports.isWalletError = isWalletError;
exports.toWalletError = toWalletError;
class WalletError extends Error {
    constructor(message, code, statusCode = 400, details) {
        super(message);
        this.name = "WalletError";
        this.code = code;
        this.statusCode = statusCode;
        this.details = details;
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, WalletError);
        }
    }
    toJSON() {
        return {
            name: this.name,
            message: this.message,
            code: this.code,
            statusCode: this.statusCode,
            details: this.details,
        };
    }
}
exports.WalletError = WalletError;
class InsufficientFundsError extends WalletError {
    constructor(available, required, currency) {
        super(`Insufficient funds: ${available} ${currency} available, ${required} required`, "INSUFFICIENT_FUNDS", 400, { available, required, currency, deficit: required - available });
        this.name = "InsufficientFundsError";
    }
}
exports.InsufficientFundsError = InsufficientFundsError;
class WalletNotFoundError extends WalletError {
    constructor(identifier) {
        super(`Wallet not found: ${identifier}`, "WALLET_NOT_FOUND", 404, {
            identifier,
        });
        this.name = "WalletNotFoundError";
    }
}
exports.WalletNotFoundError = WalletNotFoundError;
class DuplicateOperationError extends WalletError {
    constructor(idempotencyKey, existingTransactionId) {
        super("Duplicate operation detected", "DUPLICATE_OPERATION", 409, {
            idempotencyKey,
            existingTransactionId,
        });
        this.name = "DuplicateOperationError";
    }
}
exports.DuplicateOperationError = DuplicateOperationError;
class ConcurrencyError extends WalletError {
    constructor(walletId) {
        super("Concurrent modification detected, please retry", "CONCURRENCY_ERROR", 409, { walletId });
        this.name = "ConcurrencyError";
    }
}
exports.ConcurrencyError = ConcurrencyError;
class PrecisionError extends WalletError {
    constructor(value, precision) {
        super(`Value ${value} exceeds allowed precision of ${precision} decimal places`, "PRECISION_ERROR", 400, { value, precision });
        this.name = "PrecisionError";
    }
}
exports.PrecisionError = PrecisionError;
class NegativeBalanceError extends WalletError {
    constructor(walletId, calculatedBalance) {
        super("Operation would result in negative balance", "NEGATIVE_BALANCE", 400, {
            walletId,
            calculatedBalance,
        });
        this.name = "NegativeBalanceError";
    }
}
exports.NegativeBalanceError = NegativeBalanceError;
class InsufficientHeldFundsError extends WalletError {
    constructor(held, required, currency) {
        super(`Insufficient held funds: ${held} ${currency} held, ${required} required`, "INSUFFICIENT_HELD_FUNDS", 400, { held, required, currency });
        this.name = "InsufficientHeldFundsError";
    }
}
exports.InsufficientHeldFundsError = InsufficientHeldFundsError;
class NegativeInOrderError extends WalletError {
    constructor(walletId, calculatedInOrder) {
        super("Operation would result in negative inOrder amount", "NEGATIVE_IN_ORDER", 400, { walletId, calculatedInOrder });
        this.name = "NegativeInOrderError";
    }
}
exports.NegativeInOrderError = NegativeInOrderError;
class WalletDisabledError extends WalletError {
    constructor(walletId) {
        super("Wallet is disabled", "WALLET_DISABLED", 403, { walletId });
        this.name = "WalletDisabledError";
    }
}
exports.WalletDisabledError = WalletDisabledError;
class InvalidWalletTypeError extends WalletError {
    constructor(type) {
        super(`Invalid wallet type: ${type}`, "INVALID_WALLET_TYPE", 400, { type });
        this.name = "InvalidWalletTypeError";
    }
}
exports.InvalidWalletTypeError = InvalidWalletTypeError;
class InvalidAmountError extends WalletError {
    constructor(amount, reason) {
        super(`Invalid amount: ${reason}`, "INVALID_AMOUNT", 400, { amount, reason });
        this.name = "InvalidAmountError";
    }
}
exports.InvalidAmountError = InvalidAmountError;
class WalletExistsError extends WalletError {
    constructor(userId, type, currency) {
        super(`Wallet already exists: ${type}/${currency} for user ${userId}`, "WALLET_EXISTS", 409, {
            userId,
            type,
            currency,
        });
        this.name = "WalletExistsError";
    }
}
exports.WalletExistsError = WalletExistsError;
class MasterWalletNotFoundError extends WalletError {
    constructor(chain) {
        super(`Master wallet not found for chain: ${chain}`, "MASTER_WALLET_NOT_FOUND", 404, {
            chain,
        });
        this.name = "MasterWalletNotFoundError";
    }
}
exports.MasterWalletNotFoundError = MasterWalletNotFoundError;
class MasterWalletExistsError extends WalletError {
    constructor(chain) {
        super(`Master wallet already exists for chain: ${chain}`, "MASTER_WALLET_EXISTS", 400, {
            chain,
        });
        this.name = "MasterWalletExistsError";
    }
}
exports.MasterWalletExistsError = MasterWalletExistsError;
class AddressGenerationError extends WalletError {
    constructor(chain, reason) {
        super(`Failed to generate address for ${chain}: ${reason}`, "ADDRESS_GENERATION_FAILED", 500, {
            chain,
            reason,
        });
        this.name = "AddressGenerationError";
    }
}
exports.AddressGenerationError = AddressGenerationError;
class ChainServiceUnavailableError extends WalletError {
    constructor(chain) {
        super(`Chain service not available: ${chain}`, "SERVICE_UNAVAILABLE", 503, { chain });
        this.name = "ChainServiceUnavailableError";
    }
}
exports.ChainServiceUnavailableError = ChainServiceUnavailableError;
class EncryptionError extends WalletError {
    constructor(operation) {
        super(`Failed to ${operation} wallet data`, "ENCRYPTION_ERROR", 500, { operation });
        this.name = "EncryptionError";
    }
}
exports.EncryptionError = EncryptionError;
class WalletDataNotFoundError extends WalletError {
    constructor(walletId, chain) {
        super(`Wallet data not found for ${walletId}/${chain}`, "WALLET_DATA_NOT_FOUND", 404, {
            walletId,
            chain,
        });
        this.name = "WalletDataNotFoundError";
    }
}
exports.WalletDataNotFoundError = WalletDataNotFoundError;
class NetworkNotConfiguredError extends WalletError {
    constructor(chain) {
        super(`Network not configured for chain: ${chain}`, "NETWORK_NOT_CONFIGURED", 400, {
            chain,
        });
        this.name = "NetworkNotConfiguredError";
    }
}
exports.NetworkNotConfiguredError = NetworkNotConfiguredError;
class NoActiveTokensError extends WalletError {
    constructor(currency) {
        super(`No active tokens found for currency: ${currency}`, "NO_ACTIVE_TOKENS", 400, {
            currency,
        });
        this.name = "NoActiveTokensError";
    }
}
exports.NoActiveTokensError = NoActiveTokensError;
class TransferError extends WalletError {
    constructor(reason, details) {
        super(`Transfer failed: ${reason}`, "TRANSFER_FAILED", 400, details);
        this.name = "TransferError";
    }
}
exports.TransferError = TransferError;
class LedgerError extends WalletError {
    constructor(reason, details) {
        super(`Ledger operation failed: ${reason}`, "LEDGER_ERROR", 500, details);
        this.name = "LedgerError";
    }
}
exports.LedgerError = LedgerError;
class UtxoError extends WalletError {
    constructor(reason, details) {
        super(`UTXO operation failed: ${reason}`, "UTXO_ERROR", 500, details);
        this.name = "UtxoError";
    }
}
exports.UtxoError = UtxoError;
function isWalletError(error) {
    return error instanceof WalletError;
}
function toWalletError(error) {
    if (isWalletError(error)) {
        return error;
    }
    if (error instanceof Error) {
        return new WalletError(error.message, "UNKNOWN_ERROR", 500, {
            originalError: error.name,
            stack: error.stack,
        });
    }
    return new WalletError(String(error), "UNKNOWN_ERROR", 500);
}
