"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const model_validators_1 = require("@b/utils/model-validators");
class transaction extends sequelize_1.Model {
    static initModel(sequelize) {
        return transaction.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            userId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                validate: {
                    notNull: { msg: "userId: User ID cannot be null" },
                    isUUID: { args: model_validators_1.ANY_UUID_VERSION, msg: "userId: User ID must be a valid UUID" },
                },
                comment: "ID of the user associated with this transaction",
            },
            walletId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                validate: {
                    notNull: { msg: "walletId: Wallet ID cannot be null" },
                },
                comment: "ID of the wallet involved in this transaction",
            },
            type: {
                type: sequelize_1.DataTypes.ENUM("FAILED", "DEPOSIT", "WITHDRAW", "OUTGOING_TRANSFER", "INCOMING_TRANSFER", "PAYMENT", "REFUND", "BINARY_ORDER", "EXCHANGE_ORDER", "FUTURES_ORDER", "INVESTMENT", "INVESTMENT_ROI", "AI_INVESTMENT", "AI_INVESTMENT_ROI", "INVOICE", "FOREX_DEPOSIT", "FOREX_WITHDRAW", "FX_TRADING_DEPOSIT", "FX_TRADING_WITHDRAW", "FOREX_INVESTMENT", "FOREX_INVESTMENT_ROI", "ICO_CONTRIBUTION", "REFERRAL_REWARD", "STAKING", "STAKING_REWARD", "P2P_OFFER_TRANSFER", "P2P_TRADE", "NFT_PURCHASE", "NFT_SALE", "NFT_MINT", "NFT_BURN", "NFT_TRANSFER", "NFT_AUCTION_BID", "NFT_AUCTION_SETTLE", "NFT_OFFER", "ECOMMERCE_PURCHASE", "TRADING_FEE", "PLATFORM_FEE", "PLATFORM_LOSS", "ORDER_PASSTHROUGH", "GATEWAY_PAYMENT", "MARKETPLACE_PURCHASE", "MARKETPLACE_SALE", "ADJUSTMENT_ANCHOR"),
                allowNull: false,
                validate: {
                    isIn: {
                        args: [
                            [
                                "FAILED",
                                "DEPOSIT",
                                "WITHDRAW",
                                "OUTGOING_TRANSFER",
                                "INCOMING_TRANSFER",
                                "PAYMENT",
                                "REFUND",
                                "BINARY_ORDER",
                                "EXCHANGE_ORDER",
                                "FUTURES_ORDER",
                                "INVESTMENT",
                                "INVESTMENT_ROI",
                                "AI_INVESTMENT",
                                "AI_INVESTMENT_ROI",
                                "INVOICE",
                                "FOREX_DEPOSIT",
                                "FOREX_WITHDRAW",
                                "FX_TRADING_DEPOSIT",
                                "FX_TRADING_WITHDRAW",
                                "FOREX_INVESTMENT",
                                "FOREX_INVESTMENT_ROI",
                                "ICO_CONTRIBUTION",
                                "REFERRAL_REWARD",
                                "STAKING",
                                "STAKING_REWARD",
                                "P2P_OFFER_TRANSFER",
                                "P2P_TRADE",
                                "NFT_PURCHASE",
                                "NFT_SALE",
                                "NFT_MINT",
                                "NFT_BURN",
                                "NFT_TRANSFER",
                                "NFT_AUCTION_BID",
                                "NFT_AUCTION_SETTLE",
                                "NFT_OFFER",
                                "ECOMMERCE_PURCHASE",
                                "TRADING_FEE",
                                "PLATFORM_FEE",
                                "PLATFORM_LOSS",
                                "ORDER_PASSTHROUGH",
                                "GATEWAY_PAYMENT",
                                "MARKETPLACE_PURCHASE",
                                "MARKETPLACE_SALE",
                                "ADJUSTMENT_ANCHOR",
                            ],
                        ],
                        msg: "type: Type must be one of the valid transaction types",
                    },
                },
                comment: "Type of transaction (deposit, withdrawal, transfer, trading, NFT, etc.)",
            },
            status: {
                type: sequelize_1.DataTypes.ENUM("PENDING", "COMPLETED", "FAILED", "CANCELLED", "EXPIRED", "REJECTED", "REFUNDED", "FROZEN", "PROCESSING", "TIMEOUT"),
                allowNull: false,
                defaultValue: "PENDING",
                validate: {
                    isIn: {
                        args: [
                            [
                                "PENDING",
                                "COMPLETED",
                                "FAILED",
                                "CANCELLED",
                                "EXPIRED",
                                "REJECTED",
                                "REFUNDED",
                                "FROZEN",
                                "PROCESSING",
                                "TIMEOUT",
                            ],
                        ],
                        msg: "status: Status must be one of ['PENDING', 'COMPLETED', 'FAILED', 'CANCELLED', 'EXPIRED', 'REJECTED', 'REFUNDED','FROZEN', 'PROCESSING', 'TIMEOUT']",
                    },
                },
                comment: "Current status of the transaction",
            },
            amount: {
                type: sequelize_1.DataTypes.DECIMAL(36, 18),
                allowNull: false,
                validate: {
                    isDecimal: { msg: "amount: Amount must be a number" },
                },
                comment: "Transaction amount in the wallet's currency",
            },
            fee: {
                type: sequelize_1.DataTypes.DECIMAL(36, 18),
                allowNull: true,
                defaultValue: 0,
                comment: "Fee charged for this transaction",
            },
            description: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
                comment: "Human-readable description of the transaction",
            },
            metadata: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
                comment: "Additional transaction data in JSON format",
            },
            referenceId: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: true,
                comment: "External reference ID from payment processor or exchange",
            },
            trxId: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: true,
                comment: "Blockchain transaction hash or ID",
            },
            idempotencyKey: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: true,
                comment: "Idempotency key for deduplication; nullable to allow non-idempotent operations",
            },
            txHashPending: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: true,
                comment: "Pre-broadcast / in-flight on-chain hash persisted before confirmation for crash recovery",
            },
            flow: {
                type: sequelize_1.DataTypes.ENUM("IN", "OUT", "INTERNAL"),
                allowNull: true,
                comment: "Ledger direction, the typed twin of metadata.flow (LEDGER_FLOW in services/wallet/WalletService.ts)",
            },
            previousBalance: {
                type: sequelize_1.DataTypes.DECIMAL(36, 18),
                allowNull: true,
                comment: "Wallet balance before this row",
            },
            newBalance: {
                type: sequelize_1.DataTypes.DECIMAL(36, 18),
                allowNull: true,
                comment: "Wallet balance after this row",
            },
            previousInOrder: {
                type: sequelize_1.DataTypes.DECIMAL(36, 18),
                allowNull: true,
                comment: "Wallet inOrder before this row",
            },
            newInOrder: {
                type: sequelize_1.DataTypes.DECIMAL(36, 18),
                allowNull: true,
                comment: "Wallet inOrder after this row",
            },
            operationType: {
                type: sequelize_1.DataTypes.STRING(32),
                allowNull: true,
                comment: "The verb that produced this row, the typed twin of metadata.operationType",
            },
            claimedBy: {
                type: sequelize_1.DataTypes.STRING(64),
                allowNull: true,
                comment: "engine-lease instanceId of the custody worker holding this row; NULL means unclaimed and is the predicate the claim UPDATE turns on",
            },
            claimedAt: {
                type: sequelize_1.DataTypes.DATE(3),
                allowNull: true,
                comment: "When the claim was taken, so a worker that died mid-send is found by an indexed range instead of withdrawalQueue.ts:366-368 five minute guess",
            },
        }, {
            sequelize,
            modelName: "transaction",
            tableName: "transaction",
            timestamps: true,
            paranoid: true,
            indexes: [
                {
                    name: "PRIMARY",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "id" }],
                },
                {
                    name: "transactionReferenceIdKey",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "referenceId" }],
                },
                {
                    name: "transactionWalletIdForeign",
                    using: "BTREE",
                    fields: [{ name: "walletId" }],
                },
                {
                    name: "transactionUserIdFkey",
                    using: "BTREE",
                    fields: [{ name: "userId" }],
                },
                {
                    name: "transaction_idempotency_key",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "idempotencyKey" }],
                },
                {
                    name: "idx_txn_processing",
                    using: "BTREE",
                    fields: [
                        { name: "type" },
                        { name: "status" },
                        { name: "createdAt" },
                    ],
                },
                {
                    name: "idx_status_trxid_recovery",
                    using: "BTREE",
                    fields: [
                        { name: "status" },
                        { name: "trxId" },
                        { name: "createdAt" },
                    ],
                },
                {
                    name: "idx_transaction_deletedAt_createdAt",
                    using: "BTREE",
                    fields: [{ name: "deletedAt" }, { name: "createdAt" }],
                },
                {
                    name: "idx_txn_user_created",
                    using: "BTREE",
                    fields: [
                        { name: "userId" },
                        { name: "deletedAt" },
                        { name: "createdAt" },
                    ],
                },
            ],
        });
    }
    static associate(models) {
        transaction.hasOne(models.adminProfit, {
            as: "adminProfit",
            foreignKey: "transactionId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        transaction.belongsTo(models.wallet, {
            as: "wallet",
            foreignKey: "walletId",
            onDelete: "RESTRICT",
            onUpdate: "CASCADE",
        });
        transaction.belongsTo(models.user, {
            as: "user",
            foreignKey: "userId",
            onDelete: "RESTRICT",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = transaction;
