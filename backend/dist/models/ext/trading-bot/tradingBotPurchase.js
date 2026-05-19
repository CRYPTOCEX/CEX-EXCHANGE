"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class tradingBotPurchase extends sequelize_1.Model {
    static initModel(sequelize) {
        return tradingBotPurchase.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            buyerId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                validate: {
                    notEmpty: { msg: "buyerId: Buyer ID must not be empty" },
                    isUUID: { args: 4, msg: "buyerId: Must be a valid UUID" },
                },
            },
            strategyId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                validate: {
                    notEmpty: { msg: "strategyId: Strategy ID must not be empty" },
                    isUUID: { args: 4, msg: "strategyId: Must be a valid UUID" },
                },
            },
            sellerId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                validate: {
                    notEmpty: { msg: "sellerId: Seller ID must not be empty" },
                    isUUID: { args: 4, msg: "sellerId: Must be a valid UUID" },
                },
            },
            status: {
                type: sequelize_1.DataTypes.ENUM("PENDING", "COMPLETED", "REFUNDED", "FAILED"),
                allowNull: false,
                defaultValue: "PENDING",
                validate: {
                    isIn: {
                        args: [["PENDING", "COMPLETED", "REFUNDED", "FAILED"]],
                        msg: "status: Must be a valid status",
                    },
                },
            },
            price: {
                type: sequelize_1.DataTypes.DECIMAL(10, 2),
                allowNull: false,
                get() {
                    const value = this.getDataValue("price");
                    return value ? parseFloat(value.toString()) : 0;
                },
            },
            currency: {
                type: sequelize_1.DataTypes.STRING(10),
                allowNull: false,
                defaultValue: "USDT",
            },
            platformFee: {
                type: sequelize_1.DataTypes.DECIMAL(10, 2),
                allowNull: false,
                get() {
                    const value = this.getDataValue("platformFee");
                    return value ? parseFloat(value.toString()) : 0;
                },
            },
            platformFeePercent: {
                type: sequelize_1.DataTypes.DECIMAL(5, 2),
                allowNull: false,
                get() {
                    const value = this.getDataValue("platformFeePercent");
                    return value ? parseFloat(value.toString()) : 0;
                },
            },
            sellerAmount: {
                type: sequelize_1.DataTypes.DECIMAL(10, 2),
                allowNull: false,
                get() {
                    const value = this.getDataValue("sellerAmount");
                    return value ? parseFloat(value.toString()) : 0;
                },
            },
            transactionId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
            },
            walletId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
            },
            strategySnapshot: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: false,
            },
            strategyVersion: {
                type: sequelize_1.DataTypes.STRING(20),
                allowNull: false,
            },
            timesUsed: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
            },
            lastUsedAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
            },
            rating: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: true,
                validate: {
                    min: { args: [1], msg: "rating: Must be at least 1" },
                    max: { args: [5], msg: "rating: Must be at most 5" },
                },
            },
            review: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
            },
            reviewedAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
            },
        }, {
            sequelize,
            modelName: "tradingBotPurchase",
            tableName: "trading_bot_purchase",
            timestamps: true,
            indexes: [
                {
                    name: "PRIMARY",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "id" }],
                },
                {
                    name: "tradingBotPurchaseBuyerIdIdx",
                    using: "BTREE",
                    fields: [{ name: "buyerId" }],
                },
                {
                    name: "tradingBotPurchaseStrategyIdIdx",
                    using: "BTREE",
                    fields: [{ name: "strategyId" }],
                },
                {
                    name: "tradingBotPurchaseSellerIdIdx",
                    using: "BTREE",
                    fields: [{ name: "sellerId" }],
                },
                {
                    name: "tradingBotPurchaseStatusIdx",
                    using: "BTREE",
                    fields: [{ name: "status" }],
                },
                {
                    name: "tradingBotPurchaseBuyerStrategyIdx",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "buyerId" }, { name: "strategyId" }],
                },
            ],
        });
    }
    static associate(models) {
        tradingBotPurchase.belongsTo(models.user, {
            as: "buyer",
            foreignKey: "buyerId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        tradingBotPurchase.belongsTo(models.user, {
            as: "seller",
            foreignKey: "sellerId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        tradingBotPurchase.belongsTo(models.tradingBotStrategy, {
            as: "strategy",
            foreignKey: "strategyId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        tradingBotPurchase.hasMany(models.tradingBot, {
            as: "bots",
            foreignKey: "purchaseId",
            onDelete: "SET NULL",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = tradingBotPurchase;
