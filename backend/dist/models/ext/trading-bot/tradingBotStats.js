"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class tradingBotStats extends sequelize_1.Model {
    static initModel(sequelize) {
        return tradingBotStats.init({
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
            date: {
                type: sequelize_1.DataTypes.DATEONLY,
                allowNull: false,
            },
            trades: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
            },
            winningTrades: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
            },
            losingTrades: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
            },
            profit: {
                type: sequelize_1.DataTypes.DECIMAL(18, 8),
                allowNull: false,
                defaultValue: 0,
                get() {
                    const value = this.getDataValue("profit");
                    return value ? parseFloat(value.toString()) : 0;
                },
            },
            volume: {
                type: sequelize_1.DataTypes.DECIMAL(18, 8),
                allowNull: false,
                defaultValue: 0,
                get() {
                    const value = this.getDataValue("volume");
                    return value ? parseFloat(value.toString()) : 0;
                },
            },
            fees: {
                type: sequelize_1.DataTypes.DECIMAL(18, 8),
                allowNull: false,
                defaultValue: 0,
                get() {
                    const value = this.getDataValue("fees");
                    return value ? parseFloat(value.toString()) : 0;
                },
            },
            startEquity: {
                type: sequelize_1.DataTypes.DECIMAL(18, 8),
                allowNull: true,
                get() {
                    const value = this.getDataValue("startEquity");
                    return value ? parseFloat(value.toString()) : null;
                },
            },
            endEquity: {
                type: sequelize_1.DataTypes.DECIMAL(18, 8),
                allowNull: true,
                get() {
                    const value = this.getDataValue("endEquity");
                    return value ? parseFloat(value.toString()) : null;
                },
            },
            highEquity: {
                type: sequelize_1.DataTypes.DECIMAL(18, 8),
                allowNull: true,
                get() {
                    const value = this.getDataValue("highEquity");
                    return value ? parseFloat(value.toString()) : null;
                },
            },
            lowEquity: {
                type: sequelize_1.DataTypes.DECIMAL(18, 8),
                allowNull: true,
                get() {
                    const value = this.getDataValue("lowEquity");
                    return value ? parseFloat(value.toString()) : null;
                },
            },
            isPaper: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
        }, {
            sequelize,
            modelName: "tradingBotStats",
            tableName: "trading_bot_stats",
            timestamps: true,
            indexes: [
                {
                    name: "PRIMARY",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "id" }],
                },
                {
                    name: "tradingBotStatsBotIdIdx",
                    using: "BTREE",
                    fields: [{ name: "botId" }],
                },
                {
                    name: "tradingBotStatsUserIdIdx",
                    using: "BTREE",
                    fields: [{ name: "userId" }],
                },
                {
                    name: "tradingBotStatsDateIdx",
                    using: "BTREE",
                    fields: [{ name: "date" }],
                },
                {
                    name: "tradingBotStatsBotDateIdx",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "botId" }, { name: "date" }],
                },
            ],
        });
    }
    static associate(models) {
        tradingBotStats.belongsTo(models.tradingBot, {
            as: "bot",
            foreignKey: "botId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        tradingBotStats.belongsTo(models.user, {
            as: "user",
            foreignKey: "userId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = tradingBotStats;
