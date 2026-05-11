"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
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
                    isUUID: { args: 4, msg: "offerId must be a valid UUID" },
                },
            },
            buyerId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                validate: {
                    notNull: { msg: "buyerId cannot be null" },
                    isUUID: { args: 4, msg: "buyerId must be a valid UUID" },
                },
            },
            sellerId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                validate: {
                    notNull: { msg: "sellerId cannot be null" },
                    isUUID: { args: 4, msg: "sellerId must be a valid UUID" },
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
                    isUUID: { args: 4, msg: "paymentMethod must be a valid UUID" },
                },
            },
            paymentDetails: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: true,
            },
            timeline: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: true,
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
        }, {
            sequelize,
            modelName: "p2pTrade",
            tableName: "p2p_trades",
            timestamps: true,
            paranoid: true,
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
