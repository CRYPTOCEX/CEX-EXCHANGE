"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class tradingBotTrade extends sequelize_1.Model {
    static initModel(sequelize) {
        return tradingBotTrade.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            botId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                validate: {
                    notEmpty: { msg: "botId: Bot ID must not be empty" },
                    isUUID: { args: 4, msg: "botId: Must be a valid UUID" },
                },
            },
            userId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                validate: {
                    notEmpty: { msg: "userId: User ID must not be empty" },
                    isUUID: { args: 4, msg: "userId: Must be a valid UUID" },
                },
            },
            ecosystemOrderId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
            },
            symbol: {
                type: sequelize_1.DataTypes.STRING(20),
                allowNull: false,
                validate: {
                    notEmpty: { msg: "symbol: Symbol must not be empty" },
                },
            },
            side: {
                type: sequelize_1.DataTypes.ENUM("BUY", "SELL"),
                allowNull: false,
                validate: {
                    isIn: {
                        args: [["BUY", "SELL"]],
                        msg: "side: Must be BUY or SELL",
                    },
                },
            },
            type: {
                type: sequelize_1.DataTypes.ENUM("MARKET", "LIMIT"),
                allowNull: false,
                defaultValue: "MARKET",
                validate: {
                    isIn: {
                        args: [["MARKET", "LIMIT"]],
                        msg: "type: Must be MARKET or LIMIT",
                    },
                },
            },
            status: {
                type: sequelize_1.DataTypes.ENUM("PENDING", "OPEN", "CLOSED", "CANCELLED", "FAILED"),
                allowNull: false,
                defaultValue: "PENDING",
                validate: {
                    isIn: {
                        args: [["PENDING", "OPEN", "CLOSED", "CANCELLED", "FAILED"]],
                        msg: "status: Must be a valid status",
                    },
                },
            },
            amount: {
                type: sequelize_1.DataTypes.DECIMAL(18, 8),
                allowNull: false,
                get() {
                    const value = this.getDataValue("amount");
                    return value ? parseFloat(value.toString()) : 0;
                },
            },
            price: {
                type: sequelize_1.DataTypes.DECIMAL(18, 8),
                allowNull: false,
                get() {
                    const value = this.getDataValue("price");
                    return value ? parseFloat(value.toString()) : 0;
                },
            },
            cost: {
                type: sequelize_1.DataTypes.DECIMAL(18, 8),
                allowNull: false,
                get() {
                    const value = this.getDataValue("cost");
                    return value ? parseFloat(value.toString()) : 0;
                },
            },
            fee: {
                type: sequelize_1.DataTypes.DECIMAL(18, 8),
                allowNull: false,
                defaultValue: 0,
                get() {
                    const value = this.getDataValue("fee");
                    return value ? parseFloat(value.toString()) : 0;
                },
            },
            feeCurrency: {
                type: sequelize_1.DataTypes.STRING(10),
                allowNull: true,
            },
            executedAmount: {
                type: sequelize_1.DataTypes.DECIMAL(18, 8),
                allowNull: true,
                get() {
                    const value = this.getDataValue("executedAmount");
                    return value ? parseFloat(value.toString()) : null;
                },
            },
            executedPrice: {
                type: sequelize_1.DataTypes.DECIMAL(18, 8),
                allowNull: true,
                get() {
                    const value = this.getDataValue("executedPrice");
                    return value ? parseFloat(value.toString()) : null;
                },
            },
            executedCost: {
                type: sequelize_1.DataTypes.DECIMAL(18, 8),
                allowNull: true,
                get() {
                    const value = this.getDataValue("executedCost");
                    return value ? parseFloat(value.toString()) : null;
                },
            },
            entryPrice: {
                type: sequelize_1.DataTypes.DECIMAL(18, 8),
                allowNull: true,
                get() {
                    const value = this.getDataValue("entryPrice");
                    return value ? parseFloat(value.toString()) : null;
                },
            },
            exitPrice: {
                type: sequelize_1.DataTypes.DECIMAL(18, 8),
                allowNull: true,
                get() {
                    const value = this.getDataValue("exitPrice");
                    return value ? parseFloat(value.toString()) : null;
                },
            },
            profit: {
                type: sequelize_1.DataTypes.DECIMAL(18, 8),
                allowNull: true,
                get() {
                    const value = this.getDataValue("profit");
                    return value ? parseFloat(value.toString()) : null;
                },
            },
            profitPercent: {
                type: sequelize_1.DataTypes.DECIMAL(8, 4),
                allowNull: true,
                get() {
                    const value = this.getDataValue("profitPercent");
                    return value ? parseFloat(value.toString()) : null;
                },
            },
            stopLossPrice: {
                type: sequelize_1.DataTypes.DECIMAL(18, 8),
                allowNull: true,
                get() {
                    const value = this.getDataValue("stopLossPrice");
                    return value ? parseFloat(value.toString()) : null;
                },
            },
            takeProfitPrice: {
                type: sequelize_1.DataTypes.DECIMAL(18, 8),
                allowNull: true,
                get() {
                    const value = this.getDataValue("takeProfitPrice");
                    return value ? parseFloat(value.toString()) : null;
                },
            },
            stopLossTriggered: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
            takeProfitTriggered: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
            strategySignal: {
                type: sequelize_1.DataTypes.STRING(50),
                allowNull: true,
            },
            strategyContext: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: true,
            },
            isPaper: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
            openedAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
            },
            closedAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
            },
            errorMessage: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
            },
        }, {
            sequelize,
            modelName: "tradingBotTrade",
            tableName: "trading_bot_trade",
            timestamps: true,
            indexes: [
                {
                    name: "PRIMARY",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "id" }],
                },
                {
                    name: "tradingBotTradeBotIdIdx",
                    using: "BTREE",
                    fields: [{ name: "botId" }],
                },
                {
                    name: "tradingBotTradeUserIdIdx",
                    using: "BTREE",
                    fields: [{ name: "userId" }],
                },
                {
                    name: "tradingBotTradeStatusIdx",
                    using: "BTREE",
                    fields: [{ name: "status" }],
                },
                {
                    name: "tradingBotTradeSymbolIdx",
                    using: "BTREE",
                    fields: [{ name: "symbol" }],
                },
                {
                    name: "tradingBotTradeIsPaperIdx",
                    using: "BTREE",
                    fields: [{ name: "isPaper" }],
                },
                {
                    name: "tradingBotTradeBotStatusIdx",
                    using: "BTREE",
                    fields: [{ name: "botId" }, { name: "status" }],
                },
                {
                    name: "tradingBotTradeUserPaperIdx",
                    using: "BTREE",
                    fields: [{ name: "userId" }, { name: "isPaper" }],
                },
                {
                    name: "tradingBotTradeCreatedAtIdx",
                    using: "BTREE",
                    fields: [{ name: "createdAt" }],
                },
            ],
        });
    }
    static associate(models) {
        tradingBotTrade.belongsTo(models.tradingBot, {
            as: "bot",
            foreignKey: "botId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        tradingBotTrade.belongsTo(models.user, {
            as: "user",
            foreignKey: "userId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = tradingBotTrade;
