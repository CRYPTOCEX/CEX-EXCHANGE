"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class aiBot extends sequelize_1.Model {
    static initModel(sequelize) {
        return aiBot.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            marketMakerId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                validate: {
                    notEmpty: { msg: "marketMakerId: Market Maker ID must not be empty" },
                    isUUID: { args: 4, msg: "marketMakerId: Must be a valid UUID" },
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
            personality: {
                type: sequelize_1.DataTypes.ENUM("SCALPER", "SWING", "ACCUMULATOR", "DISTRIBUTOR", "MARKET_MAKER"),
                allowNull: false,
                defaultValue: "SCALPER",
                validate: {
                    isIn: {
                        args: [["SCALPER", "SWING", "ACCUMULATOR", "DISTRIBUTOR", "MARKET_MAKER"]],
                        msg: "personality: Must be a valid bot personality type",
                    },
                },
            },
            riskTolerance: {
                type: sequelize_1.DataTypes.DECIMAL(3, 2),
                allowNull: false,
                defaultValue: 0.5,
                validate: {
                    isDecimal: { msg: "riskTolerance: Must be a valid decimal number" },
                    min: { args: [0.1], msg: "riskTolerance: Must be at least 0.1" },
                    max: { args: [1.0], msg: "riskTolerance: Must be at most 1.0" },
                },
                get() {
                    const value = this.getDataValue("riskTolerance");
                    return value ? parseFloat(value.toString()) : 0.5;
                },
            },
            tradeFrequency: {
                type: sequelize_1.DataTypes.ENUM("HIGH", "MEDIUM", "LOW"),
                allowNull: false,
                defaultValue: "MEDIUM",
                validate: {
                    isIn: {
                        args: [["HIGH", "MEDIUM", "LOW"]],
                        msg: "tradeFrequency: Must be HIGH, MEDIUM, or LOW",
                    },
                },
            },
            avgOrderSize: {
                type: sequelize_1.DataTypes.DECIMAL(30, 18),
                allowNull: false,
                defaultValue: 0,
                validate: {
                    isDecimal: { msg: "avgOrderSize: Must be a valid decimal number" },
                    min: { args: [0], msg: "avgOrderSize: Must be greater than or equal to 0" },
                },
                get() {
                    const value = this.getDataValue("avgOrderSize");
                    return value ? parseFloat(value.toString()) : 0;
                },
            },
            orderSizeVariance: {
                type: sequelize_1.DataTypes.DECIMAL(3, 2),
                allowNull: false,
                defaultValue: 0.2,
                validate: {
                    isDecimal: { msg: "orderSizeVariance: Must be a valid decimal number" },
                    min: { args: [0.1], msg: "orderSizeVariance: Must be at least 0.1 (10%)" },
                    max: { args: [0.5], msg: "orderSizeVariance: Must be at most 0.5 (50%)" },
                },
                get() {
                    const value = this.getDataValue("orderSizeVariance");
                    return value ? parseFloat(value.toString()) : 0.2;
                },
            },
            preferredSpread: {
                type: sequelize_1.DataTypes.DECIMAL(5, 4),
                allowNull: false,
                defaultValue: 0.001,
                validate: {
                    isDecimal: { msg: "preferredSpread: Must be a valid decimal number" },
                    min: { args: [0.0001], msg: "preferredSpread: Must be at least 0.0001 (0.01%)" },
                    max: { args: [0.1], msg: "preferredSpread: Must be at most 0.1 (10%)" },
                },
                get() {
                    const value = this.getDataValue("preferredSpread");
                    return value ? parseFloat(value.toString()) : 0.001;
                },
            },
            status: {
                type: sequelize_1.DataTypes.ENUM("ACTIVE", "PAUSED", "COOLDOWN"),
                allowNull: false,
                defaultValue: "PAUSED",
                validate: {
                    isIn: {
                        args: [["ACTIVE", "PAUSED", "COOLDOWN"]],
                        msg: "status: Must be ACTIVE, PAUSED, or COOLDOWN",
                    },
                },
            },
            lastTradeAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
            },
            dailyTradeCount: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
                validate: {
                    isInt: { msg: "dailyTradeCount: Must be an integer" },
                    min: { args: [0], msg: "dailyTradeCount: Must be greater than or equal to 0" },
                },
            },
            maxDailyTrades: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 100,
                validate: {
                    isInt: { msg: "maxDailyTrades: Must be an integer" },
                    min: { args: [1], msg: "maxDailyTrades: Must be at least 1" },
                },
            },
            realTradesExecuted: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
                validate: {
                    isInt: { msg: "realTradesExecuted: Must be an integer" },
                    min: { args: [0], msg: "realTradesExecuted: Must be >= 0" },
                },
            },
            profitableTrades: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
                validate: {
                    isInt: { msg: "profitableTrades: Must be an integer" },
                    min: { args: [0], msg: "profitableTrades: Must be >= 0" },
                },
            },
            totalRealizedPnL: {
                type: sequelize_1.DataTypes.DECIMAL(30, 18),
                allowNull: false,
                defaultValue: 0,
                get() {
                    const value = this.getDataValue("totalRealizedPnL");
                    return value ? parseFloat(value.toString()) : 0;
                },
            },
            totalVolume: {
                type: sequelize_1.DataTypes.DECIMAL(30, 18),
                allowNull: false,
                defaultValue: 0,
                get() {
                    const value = this.getDataValue("totalVolume");
                    return value ? parseFloat(value.toString()) : 0;
                },
            },
            currentPosition: {
                type: sequelize_1.DataTypes.DECIMAL(30, 18),
                allowNull: false,
                defaultValue: 0,
                get() {
                    const value = this.getDataValue("currentPosition");
                    return value ? parseFloat(value.toString()) : 0;
                },
            },
            avgEntryPrice: {
                type: sequelize_1.DataTypes.DECIMAL(30, 18),
                allowNull: false,
                defaultValue: 0,
                get() {
                    const value = this.getDataValue("avgEntryPrice");
                    return value ? parseFloat(value.toString()) : 0;
                },
            },
        }, {
            sequelize,
            modelName: "aiBot",
            tableName: "ai_bot",
            timestamps: true,
            indexes: [
                {
                    name: "PRIMARY",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "id" }],
                },
                {
                    name: "aiBotMarketMakerIdIdx",
                    using: "BTREE",
                    fields: [{ name: "marketMakerId" }],
                },
                {
                    name: "aiBotStatusIdx",
                    using: "BTREE",
                    fields: [{ name: "status" }],
                },
                {
                    name: "aiBotPersonalityIdx",
                    using: "BTREE",
                    fields: [{ name: "personality" }],
                },
                {
                    name: "aiBotMarketMakerStatusIdx",
                    using: "BTREE",
                    fields: [{ name: "marketMakerId" }, { name: "status" }],
                },
                {
                    name: "aiBotPnLIdx",
                    using: "BTREE",
                    fields: [{ name: "totalRealizedPnL" }],
                },
            ],
        });
    }
    static associate(models) {
        aiBot.belongsTo(models.aiMarketMaker, {
            as: "marketMaker",
            foreignKey: "marketMakerId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = aiBot;
