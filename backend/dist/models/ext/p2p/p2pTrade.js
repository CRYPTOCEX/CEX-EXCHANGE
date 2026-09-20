"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const model_validators_1 = require("@b/utils/model-validators");
const json_column_1 = require("@b/utils/json-column");
class p2pTrade extends sequelize_1.Model {
    static initModel(sequelize) {
        return p2pTrade.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            offerId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                validate: {
                    notNull: { msg: "offerId cannot be null" },
                    isUUID: { args: model_validators_1.ANY_UUID_VERSION, msg: "offerId must be a valid UUID" },
                },
            },
            buyerId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                validate: {
                    notNull: { msg: "buyerId cannot be null" },
                    isUUID: { args: model_validators_1.ANY_UUID_VERSION, msg: "buyerId must be a valid UUID" },
                },
            },
            sellerId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                validate: {
                    notNull: { msg: "sellerId cannot be null" },
                    isUUID: { args: model_validators_1.ANY_UUID_VERSION, msg: "sellerId must be a valid UUID" },
                },
            },
            type: {
                type: sequelize_1.DataTypes.ENUM("BUY", "SELL"),
                allowNull: false,
                validate: {
                    isIn: { args: [["BUY", "SELL"]], msg: "type must be BUY or SELL" },
                },
            },
            currency: {
                type: sequelize_1.DataTypes.STRING(50),
                allowNull: false,
                validate: { notEmpty: { msg: "currency must not be empty" } },
            },
            amount: {
                type: sequelize_1.DataTypes.DOUBLE,
                allowNull: false,
                validate: {
                    isFloat: { msg: "amount must be a valid number" },
                    min: { args: [0], msg: "amount cannot be negative" },
                },
            },
            price: {
                type: sequelize_1.DataTypes.DOUBLE,
                allowNull: false,
                validate: {
                    isFloat: { msg: "price must be a valid number" },
                    min: { args: [0], msg: "price cannot be negative" },
                },
            },
            total: {
                type: sequelize_1.DataTypes.DOUBLE,
                allowNull: false,
                validate: {
                    isFloat: { msg: "total must be a valid number" },
                    min: { args: [0], msg: "total cannot be negative" },
                },
            },
            status: {
                type: sequelize_1.DataTypes.ENUM("PENDING", "PAYMENT_SENT", "COMPLETED", "CANCELLED", "DISPUTED", "EXPIRED"),
                allowNull: false,
                defaultValue: "PENDING",
                validate: {
                    isIn: {
                        args: [
                            [
                                "PENDING",
                                "PAYMENT_SENT",
                                "COMPLETED",
                                "CANCELLED",
                                "DISPUTED",
                                "EXPIRED",
                            ],
                        ],
                        msg: "Invalid status",
                    },
                },
            },
            paymentMethod: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                validate: {
                    notNull: { msg: "paymentMethod cannot be null" },
                    isUUID: { args: model_validators_1.ANY_UUID_VERSION, msg: "paymentMethod must be a valid UUID" },
                },
            },
            paymentDetails: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: true,
                get() {
                    const value = this.getDataValue("paymentDetails");
                    if (value == null)
                        return null;
                    if (typeof value === "string") {
                        try {
                            return JSON.parse(value);
                        }
                        catch (_a) {
                            return null;
                        }
                    }
                    return value;
                },
            },
            timeline: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: true,
                get() {
                    return (0, json_column_1.readJsonArrayColumn)(this.getDataValue("timeline"));
                },
            },
            terms: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
            },
            escrowFee: {
                type: sequelize_1.DataTypes.STRING(50),
                allowNull: true,
            },
            escrowTime: {
                type: sequelize_1.DataTypes.STRING(50),
                allowNull: true,
            },
            paymentConfirmedAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
            },
            paymentReference: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: true,
            },
            escrowAmount: {
                type: sequelize_1.DataTypes.DOUBLE,
                allowNull: true,
                validate: {
                    isFloat: { msg: "escrowAmount must be a valid number" },
                    min: { args: [0], msg: "escrowAmount cannot be negative" },
                },
            },
            escrowStatus: {
                type: sequelize_1.DataTypes.ENUM("NONE", "HELD", "RELEASED", "REFUNDED"),
                allowNull: false,
                defaultValue: "NONE",
                validate: {
                    isIn: {
                        args: [["NONE", "HELD", "RELEASED", "REFUNDED"]],
                        msg: "Invalid escrowStatus",
                    },
                },
            },
            escrowCurrency: {
                type: sequelize_1.DataTypes.STRING(50),
                allowNull: true,
                comment: "Currency the escrow is held in. NULL = legacy row, use trade.currency.",
            },
            escrowWalletType: {
                type: sequelize_1.DataTypes.ENUM("FIAT", "SPOT", "ECO"),
                allowNull: true,
                comment: "Wallet type the escrow is held in. NULL = legacy row, use offer.walletType. FIAT is legal here for pre-existing holds.",
                validate: {
                    isIn: {
                        args: [["FIAT", "SPOT", "ECO"]],
                        msg: "Invalid escrowWalletType",
                    },
                },
            },
            escrowOwnerId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
                comment: "User whose wallet holds the escrow. NULL = legacy row, use trade.sellerId.",
                validate: {
                    isUUID: { args: model_validators_1.ANY_UUID_VERSION, msg: "escrowOwnerId must be a valid UUID" },
                },
            },
            completedAt: { type: sequelize_1.DataTypes.DATE, allowNull: true },
            cancelledAt: { type: sequelize_1.DataTypes.DATE, allowNull: true },
            disputedAt: { type: sequelize_1.DataTypes.DATE, allowNull: true },
            cancelledBy: { type: sequelize_1.DataTypes.UUID, allowNull: true },
            cancellationReason: { type: sequelize_1.DataTypes.STRING(500), allowNull: true },
            resolution: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: true,
                get() {
                    const value = this.getDataValue("resolution");
                    if (value == null)
                        return null;
                    if (typeof value === "string") {
                        try {
                            return JSON.parse(value);
                        }
                        catch (_a) {
                            return null;
                        }
                    }
                    return value;
                },
            },
        }, {
            sequelize,
            modelName: "p2pTrade",
            tableName: "p2p_trades",
            timestamps: true,
            paranoid: true,
            indexes: [
                {
                    name: "idx_p2p_trade_status",
                    using: "BTREE",
                    fields: [{ name: "status" }],
                },
                {
                    name: "idx_p2p_trade_buyerId_status",
                    using: "BTREE",
                    fields: [{ name: "buyerId" }, { name: "status" }],
                },
                {
                    name: "idx_p2p_trade_sellerId_status",
                    using: "BTREE",
                    fields: [{ name: "sellerId" }, { name: "status" }],
                },
                {
                    name: "idx_p2p_trade_createdAt",
                    using: "BTREE",
                    fields: [{ name: "createdAt" }],
                },
                {
                    name: "idx_p2p_trade_escrowStatus",
                    using: "BTREE",
                    fields: [{ name: "escrowStatus" }],
                },
            ],
        });
    }
    static associate(models) {
        p2pTrade.belongsTo(models.user, {
            as: "buyer",
            foreignKey: "buyerId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        p2pTrade.belongsTo(models.user, {
            as: "seller",
            foreignKey: "sellerId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        p2pTrade.belongsTo(models.p2pOffer, {
            as: "offer",
            foreignKey: "offerId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        p2pTrade.hasOne(models.p2pDispute, {
            as: "dispute",
            foreignKey: "tradeId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        p2pTrade.hasMany(models.p2pReview, {
            as: "reviews",
            foreignKey: "tradeId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        p2pTrade.belongsTo(models.p2pPaymentMethod, {
            as: "paymentMethodDetails",
            foreignKey: "paymentMethod",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = p2pTrade;
