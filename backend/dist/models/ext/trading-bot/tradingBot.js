"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class tradingBot extends sequelize_1.Model {
    static initModel(sequelize) {
        return tradingBot.init({
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
                    notEmpty: { msg: "userId: User ID must not be empty" },
                    isUUID: { args: 4, msg: "userId: Must be a valid UUID" },
                },
            },
            name: {
                type: sequelize_1.DataTypes.STRING(100),
                allowNull: false,
                validate: {
                    notEmpty: { msg: "name: Bot name must not be empty" },
                    len: {
                        args: [1, 100],
                        msg: "name: Bot name must be between 1 and 100 characters",
                    },
                },
            },
            description: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
            },
            symbol: {
                type: sequelize_1.DataTypes.STRING(20),
                allowNull: false,
                validate: {
                    notEmpty: { msg: "symbol: Symbol must not be empty" },
                },
            },
            type: {
                type: sequelize_1.DataTypes.ENUM("DCA", "GRID", "INDICATOR", "TRAILING_STOP", "CUSTOM"),
                allowNull: false,
                defaultValue: "DCA",
                validate: {
                    isIn: {
                        args: [["DCA", "GRID", "INDICATOR", "TRAILING_STOP", "CUSTOM"]],
                        msg: "type: Must be a valid bot type",
                    },
                },
            },
            mode: {
                type: sequelize_1.DataTypes.ENUM("LIVE", "PAPER"),
                allowNull: false,
                defaultValue: "LIVE",
                validate: {
                    isIn: {
                        args: [["LIVE", "PAPER"]],
                        msg: "mode: Must be LIVE or PAPER",
                    },
                },
            },
            status: {
                type: sequelize_1.DataTypes.ENUM("DRAFT", "RUNNING", "PAUSED", "STOPPED", "ERROR", "LIMIT_REACHED"),
                allowNull: false,
                defaultValue: "DRAFT",
                validate: {
                    isIn: {
                        args: [["DRAFT", "RUNNING", "PAUSED", "STOPPED", "ERROR", "LIMIT_REACHED"]],
                        msg: "status: Must be a valid status",
                    },
                },
            },
            strategyConfig: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: false,
                defaultValue: {},
            },
            maxPositionSize: {
                type: sequelize_1.DataTypes.DECIMAL(18, 8),
                allowNull: false,
                defaultValue: 100,
                get() {
                    const value = this.getDataValue("maxPositionSize");
                    return value ? parseFloat(value.toString()) : 100;
                },
            },
            maxConcurrentTrades: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 5,
                validate: {
                    min: { args: [1], msg: "maxConcurrentTrades: Must be at least 1" },
                },
            },
            dailyLossLimit: {
                type: sequelize_1.DataTypes.DECIMAL(18, 8),
                allowNull: true,
                get() {
                    const value = this.getDataValue("dailyLossLimit");
                    return value ? parseFloat(value.toString()) : null;
                },
            },
            dailyLossLimitPercent: {
                type: sequelize_1.DataTypes.DECIMAL(5, 2),
                allowNull: true,
                get() {
                    const value = this.getDataValue("dailyLossLimitPercent");
                    return value ? parseFloat(value.toString()) : null;
                },
            },
            maxDrawdownPercent: {
                type: sequelize_1.DataTypes.DECIMAL(5, 2),
                allowNull: true,
                get() {
                    const value = this.getDataValue("maxDrawdownPercent");
                    return value ? parseFloat(value.toString()) : null;
                },
            },
            cooldownSeconds: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 60,
                validate: {
                    min: { args: [0], msg: "cooldownSeconds: Must be at least 0" },
                },
            },
            stopLossPercent: {
                type: sequelize_1.DataTypes.DECIMAL(5, 2),
                allowNull: true,
                get() {
                    const value = this.getDataValue("stopLossPercent");
                    return value ? parseFloat(value.toString()) : null;
                },
            },
            takeProfitPercent: {
                type: sequelize_1.DataTypes.DECIMAL(5, 2),
                allowNull: true,
                get() {
                    const value = this.getDataValue("takeProfitPercent");
                    return value ? parseFloat(value.toString()) : null;
                },
            },
            allocatedAmount: {
                type: sequelize_1.DataTypes.DECIMAL(18, 8),
                allowNull: false,
                defaultValue: 0,
                get() {
                    const value = this.getDataValue("allocatedAmount");
                    return value ? parseFloat(value.toString()) : 0;
                },
            },
            usedAmount: {
                type: sequelize_1.DataTypes.DECIMAL(18, 8),
                allowNull: false,
                defaultValue: 0,
                get() {
                    const value = this.getDataValue("usedAmount");
                    return value ? parseFloat(value.toString()) : 0;
                },
            },
            totalTrades: {
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
            totalProfit: {
                type: sequelize_1.DataTypes.DECIMAL(18, 8),
                allowNull: false,
                defaultValue: 0,
                get() {
                    const value = this.getDataValue("totalProfit");
                    return value ? parseFloat(value.toString()) : 0;
                },
            },
            totalVolume: {
                type: sequelize_1.DataTypes.DECIMAL(18, 8),
                allowNull: false,
                defaultValue: 0,
                get() {
                    const value = this.getDataValue("totalVolume");
                    return value ? parseFloat(value.toString()) : 0;
                },
            },
            totalFees: {
                type: sequelize_1.DataTypes.DECIMAL(18, 8),
                allowNull: false,
                defaultValue: 0,
                get() {
                    const value = this.getDataValue("totalFees");
                    return value ? parseFloat(value.toString()) : 0;
                },
            },
            dailyTrades: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
            },
            dailyProfit: {
                type: sequelize_1.DataTypes.DECIMAL(18, 8),
                allowNull: false,
                defaultValue: 0,
                get() {
                    const value = this.getDataValue("dailyProfit");
                    return value ? parseFloat(value.toString()) : 0;
                },
            },
            dailyVolume: {
                type: sequelize_1.DataTypes.DECIMAL(18, 8),
                allowNull: false,
                defaultValue: 0,
                get() {
                    const value = this.getDataValue("dailyVolume");
                    return value ? parseFloat(value.toString()) : 0;
                },
            },
            dailyResetAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
            },
            peakEquity: {
                type: sequelize_1.DataTypes.DECIMAL(18, 8),
                allowNull: false,
                defaultValue: 0,
                get() {
                    const value = this.getDataValue("peakEquity");
                    return value ? parseFloat(value.toString()) : 0;
                },
            },
            currentDrawdown: {
                type: sequelize_1.DataTypes.DECIMAL(5, 2),
                allowNull: false,
                defaultValue: 0,
                get() {
                    const value = this.getDataValue("currentDrawdown");
                    return value ? parseFloat(value.toString()) : 0;
                },
            },
            purchaseId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
            },
            lastTickAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
            },
            lastTradeAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
            },
            lastErrorAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
            },
            lastError: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
            },
            errorCount: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
            },
            startedAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
            },
            stoppedAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
            },
            pausedAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
            },
        }, {
            sequelize,
            modelName: "tradingBot",
            tableName: "trading_bot",
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
                    name: "tradingBotUserIdIdx",
                    using: "BTREE",
                    fields: [{ name: "userId" }],
                },
                {
                    name: "tradingBotStatusIdx",
                    using: "BTREE",
                    fields: [{ name: "status" }],
                },
                {
                    name: "tradingBotTypeIdx",
                    using: "BTREE",
                    fields: [{ name: "type" }],
                },
                {
                    name: "tradingBotModeIdx",
                    using: "BTREE",
                    fields: [{ name: "mode" }],
                },
                {
                    name: "tradingBotSymbolIdx",
                    using: "BTREE",
                    fields: [{ name: "symbol" }],
                },
                {
                    name: "tradingBotUserStatusIdx",
                    using: "BTREE",
                    fields: [{ name: "userId" }, { name: "status" }],
                },
            ],
        });
    }
    static associate(models) {
        tradingBot.belongsTo(models.user, {
            as: "user",
            foreignKey: "userId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        tradingBot.belongsTo(models.tradingBotPurchase, {
            as: "purchase",
            foreignKey: "purchaseId",
            onDelete: "SET NULL",
            onUpdate: "CASCADE",
        });
        tradingBot.hasMany(models.tradingBotTrade, {
            as: "trades",
            foreignKey: "botId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        tradingBot.hasMany(models.tradingBotOrder, {
            as: "orders",
            foreignKey: "botId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        tradingBot.hasMany(models.tradingBotStats, {
            as: "stats",
            foreignKey: "botId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        tradingBot.hasMany(models.tradingBotAuditLog, {
            as: "auditLogs",
            foreignKey: "botId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = tradingBot;
