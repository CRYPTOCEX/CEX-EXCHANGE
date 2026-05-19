"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class tradingBotOrder extends sequelize_1.Model {
    static initModel(sequelize) {
        return tradingBotOrder.init({
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
            tradeId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
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
                type: sequelize_1.DataTypes.ENUM("LIMIT", "STOP_LIMIT"),
                allowNull: false,
                validate: {
                    isIn: {
                        args: [["LIMIT", "STOP_LIMIT"]],
                        msg: "type: Must be LIMIT or STOP_LIMIT",
                    },
                },
            },
            status: {
                type: sequelize_1.DataTypes.ENUM("PENDING", "OPEN", "PARTIAL", "FILLED", "CANCELLED", "EXPIRED", "FAILED"),
                allowNull: false,
                defaultValue: "PENDING",
                validate: {
                    isIn: {
                        args: [["PENDING", "OPEN", "PARTIAL", "FILLED", "CANCELLED", "EXPIRED", "FAILED"]],
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
            stopPrice: {
                type: sequelize_1.DataTypes.DECIMAL(18, 8),
                allowNull: true,
                get() {
                    const value = this.getDataValue("stopPrice");
                    return value ? parseFloat(value.toString()) : null;
                },
            },
            filledAmount: {
                type: sequelize_1.DataTypes.DECIMAL(18, 8),
                allowNull: false,
                defaultValue: 0,
                get() {
                    const value = this.getDataValue("filledAmount");
                    return value ? parseFloat(value.toString()) : 0;
                },
            },
            remainingAmount: {
                type: sequelize_1.DataTypes.DECIMAL(18, 8),
                allowNull: false,
                get() {
                    const value = this.getDataValue("remainingAmount");
                    return value ? parseFloat(value.toString()) : 0;
                },
            },
            purpose: {
                type: sequelize_1.DataTypes.ENUM("ENTRY", "EXIT", "STOP_LOSS", "TAKE_PROFIT", "GRID_BUY", "GRID_SELL", "DCA"),
                allowNull: false,
                validate: {
                    isIn: {
                        args: [["ENTRY", "EXIT", "STOP_LOSS", "TAKE_PROFIT", "GRID_BUY", "GRID_SELL", "DCA"]],
                        msg: "purpose: Must be a valid purpose",
                    },
                },
            },
            gridLevel: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: true,
            },
            isPaper: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
            expiresAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
            },
        }, {
            sequelize,
            modelName: "tradingBotOrder",
            tableName: "trading_bot_order",
            timestamps: true,
            indexes: [
                {
                    name: "PRIMARY",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "id" }],
                },
                {
                    name: "tradingBotOrderBotIdIdx",
                    using: "BTREE",
                    fields: [{ name: "botId" }],
                },
                {
                    name: "tradingBotOrderUserIdIdx",
                    using: "BTREE",
                    fields: [{ name: "userId" }],
                },
                {
                    name: "tradingBotOrderStatusIdx",
                    using: "BTREE",
                    fields: [{ name: "status" }],
                },
                {
                    name: "tradingBotOrderSymbolStatusIdx",
                    using: "BTREE",
                    fields: [{ name: "symbol" }, { name: "status" }],
                },
                {
                    name: "tradingBotOrderExpiresAtIdx",
                    using: "BTREE",
                    fields: [{ name: "expiresAt" }],
                },
            ],
        });
    }
    static associate(models) {
        tradingBotOrder.belongsTo(models.tradingBot, {
            as: "bot",
            foreignKey: "botId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        tradingBotOrder.belongsTo(models.user, {
            as: "user",
            foreignKey: "userId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        tradingBotOrder.belongsTo(models.tradingBotTrade, {
            as: "trade",
            foreignKey: "tradeId",
            onDelete: "SET NULL",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = tradingBotOrder;
