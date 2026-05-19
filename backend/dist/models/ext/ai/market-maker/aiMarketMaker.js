"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const console_1 = require("@b/utils/console");
class aiMarketMaker extends sequelize_1.Model {
    static initModel(sequelize) {
        return aiMarketMaker.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            marketId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                unique: true,
                validate: {
                    notEmpty: { msg: "marketId: Market ID must not be empty" },
                    isUUID: { args: 4, msg: "marketId: Must be a valid UUID" },
                },
            },
            status: {
                type: sequelize_1.DataTypes.ENUM("ACTIVE", "PAUSED", "STOPPED"),
                allowNull: false,
                defaultValue: "STOPPED",
                validate: {
                    isIn: {
                        args: [["ACTIVE", "PAUSED", "STOPPED"]],
                        msg: "status: Must be ACTIVE, PAUSED, or STOPPED",
                    },
                },
            },
            targetPrice: {
                type: sequelize_1.DataTypes.DECIMAL(30, 18),
                allowNull: false,
                defaultValue: 0,
                validate: {
                    isDecimal: { msg: "targetPrice: Must be a valid decimal number" },
                    min: { args: [0], msg: "targetPrice: Must be greater than or equal to 0" },
                },
                get() {
                    const value = this.getDataValue("targetPrice");
                    return value ? parseFloat(value.toString()) : 0;
                },
            },
            priceRangeLow: {
                type: sequelize_1.DataTypes.DECIMAL(30, 18),
                allowNull: false,
                defaultValue: 0,
                validate: {
                    isDecimal: { msg: "priceRangeLow: Must be a valid decimal number" },
                    min: { args: [0], msg: "priceRangeLow: Must be greater than or equal to 0" },
                },
                get() {
                    const value = this.getDataValue("priceRangeLow");
                    return value ? parseFloat(value.toString()) : 0;
                },
            },
            priceRangeHigh: {
                type: sequelize_1.DataTypes.DECIMAL(30, 18),
                allowNull: false,
                defaultValue: 0,
                validate: {
                    isDecimal: { msg: "priceRangeHigh: Must be a valid decimal number" },
                    min: { args: [0], msg: "priceRangeHigh: Must be greater than or equal to 0" },
                },
                get() {
                    const value = this.getDataValue("priceRangeHigh");
                    return value ? parseFloat(value.toString()) : 0;
                },
            },
            aggressionLevel: {
                type: sequelize_1.DataTypes.ENUM("CONSERVATIVE", "MODERATE", "AGGRESSIVE"),
                allowNull: false,
                defaultValue: "CONSERVATIVE",
                validate: {
                    isIn: {
                        args: [["CONSERVATIVE", "MODERATE", "AGGRESSIVE"]],
                        msg: "aggressionLevel: Must be CONSERVATIVE, MODERATE, or AGGRESSIVE",
                    },
                },
            },
            maxDailyVolume: {
                type: sequelize_1.DataTypes.DECIMAL(30, 18),
                allowNull: false,
                defaultValue: 0,
                validate: {
                    isDecimal: { msg: "maxDailyVolume: Must be a valid decimal number" },
                    min: { args: [0], msg: "maxDailyVolume: Must be greater than or equal to 0" },
                },
                get() {
                    const value = this.getDataValue("maxDailyVolume");
                    return value ? parseFloat(value.toString()) : 0;
                },
            },
            currentDailyVolume: {
                type: sequelize_1.DataTypes.DECIMAL(30, 18),
                allowNull: false,
                defaultValue: 0,
                validate: {
                    isDecimal: { msg: "currentDailyVolume: Must be a valid decimal number" },
                    min: { args: [0], msg: "currentDailyVolume: Must be greater than or equal to 0" },
                },
                get() {
                    const value = this.getDataValue("currentDailyVolume");
                    return value ? parseFloat(value.toString()) : 0;
                },
            },
            volatilityThreshold: {
                type: sequelize_1.DataTypes.DECIMAL(5, 2),
                allowNull: false,
                defaultValue: 5.0,
                validate: {
                    isDecimal: { msg: "volatilityThreshold: Must be a valid decimal number" },
                    min: { args: [0], msg: "volatilityThreshold: Must be greater than or equal to 0" },
                    max: { args: [100], msg: "volatilityThreshold: Must be less than or equal to 100" },
                },
                get() {
                    const value = this.getDataValue("volatilityThreshold");
                    return value ? parseFloat(value.toString()) : 5.0;
                },
            },
            pauseOnHighVolatility: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: true,
            },
            realLiquidityPercent: {
                type: sequelize_1.DataTypes.DECIMAL(5, 2),
                allowNull: false,
                defaultValue: 0,
                validate: {
                    isDecimal: { msg: "realLiquidityPercent: Must be a valid decimal number" },
                    min: { args: [0], msg: "realLiquidityPercent: Must be at least 0" },
                    max: { args: [100], msg: "realLiquidityPercent: Must be at most 100" },
                },
                get() {
                    const value = this.getDataValue("realLiquidityPercent");
                    return value ? parseFloat(value.toString()) : 0;
                },
            },
            priceMode: {
                type: sequelize_1.DataTypes.ENUM("AUTONOMOUS", "FOLLOW_EXTERNAL", "HYBRID"),
                allowNull: false,
                defaultValue: "AUTONOMOUS",
                validate: {
                    isIn: {
                        args: [["AUTONOMOUS", "FOLLOW_EXTERNAL", "HYBRID"]],
                        msg: "priceMode: Must be AUTONOMOUS, FOLLOW_EXTERNAL, or HYBRID",
                    },
                },
            },
            externalSymbol: {
                type: sequelize_1.DataTypes.STRING(20),
                allowNull: true,
                defaultValue: null,
                comment: "External symbol to track (e.g., BTC/USDT) when in FOLLOW or HYBRID mode",
            },
            correlationStrength: {
                type: sequelize_1.DataTypes.DECIMAL(5, 2),
                allowNull: false,
                defaultValue: 50,
                validate: {
                    isDecimal: { msg: "correlationStrength: Must be a valid decimal number" },
                    min: { args: [0], msg: "correlationStrength: Must be at least 0" },
                    max: { args: [100], msg: "correlationStrength: Must be at most 100" },
                },
                get() {
                    const value = this.getDataValue("correlationStrength");
                    return value ? parseFloat(value.toString()) : 50;
                },
            },
            marketBias: {
                type: sequelize_1.DataTypes.ENUM("BULLISH", "BEARISH", "NEUTRAL"),
                allowNull: false,
                defaultValue: "NEUTRAL",
                validate: {
                    isIn: {
                        args: [["BULLISH", "BEARISH", "NEUTRAL"]],
                        msg: "marketBias: Must be BULLISH, BEARISH, or NEUTRAL",
                    },
                },
            },
            biasStrength: {
                type: sequelize_1.DataTypes.DECIMAL(5, 2),
                allowNull: false,
                defaultValue: 50,
                validate: {
                    isDecimal: { msg: "biasStrength: Must be a valid decimal number" },
                    min: { args: [0], msg: "biasStrength: Must be at least 0" },
                    max: { args: [100], msg: "biasStrength: Must be at most 100" },
                },
                get() {
                    const value = this.getDataValue("biasStrength");
                    return value ? parseFloat(value.toString()) : 50;
                },
            },
            currentPhase: {
                type: sequelize_1.DataTypes.ENUM("ACCUMULATION", "MARKUP", "DISTRIBUTION", "MARKDOWN"),
                allowNull: false,
                defaultValue: "ACCUMULATION",
                validate: {
                    isIn: {
                        args: [["ACCUMULATION", "MARKUP", "DISTRIBUTION", "MARKDOWN"]],
                        msg: "currentPhase: Must be ACCUMULATION, MARKUP, DISTRIBUTION, or MARKDOWN",
                    },
                },
            },
            phaseStartedAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
                defaultValue: null,
            },
            nextPhaseChangeAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
                defaultValue: null,
            },
            phaseTargetPrice: {
                type: sequelize_1.DataTypes.DECIMAL(30, 18),
                allowNull: true,
                defaultValue: null,
                get() {
                    const value = this.getDataValue("phaseTargetPrice");
                    return value ? parseFloat(value.toString()) : null;
                },
            },
            baseVolatility: {
                type: sequelize_1.DataTypes.DECIMAL(5, 2),
                allowNull: false,
                defaultValue: 2.0,
                validate: {
                    isDecimal: { msg: "baseVolatility: Must be a valid decimal number" },
                    min: { args: [0.1], msg: "baseVolatility: Must be at least 0.1" },
                    max: { args: [50], msg: "baseVolatility: Must be at most 50" },
                },
                get() {
                    const value = this.getDataValue("baseVolatility");
                    return value ? parseFloat(value.toString()) : 2.0;
                },
            },
            volatilityMultiplier: {
                type: sequelize_1.DataTypes.DECIMAL(3, 2),
                allowNull: false,
                defaultValue: 1.0,
                validate: {
                    isDecimal: { msg: "volatilityMultiplier: Must be a valid decimal number" },
                    min: { args: [0.5], msg: "volatilityMultiplier: Must be at least 0.5" },
                    max: { args: [2.0], msg: "volatilityMultiplier: Must be at most 2.0" },
                },
                get() {
                    const value = this.getDataValue("volatilityMultiplier");
                    return value ? parseFloat(value.toString()) : 1.0;
                },
            },
            momentumDecay: {
                type: sequelize_1.DataTypes.DECIMAL(4, 3),
                allowNull: false,
                defaultValue: 0.95,
                validate: {
                    isDecimal: { msg: "momentumDecay: Must be a valid decimal number" },
                    min: { args: [0.8], msg: "momentumDecay: Must be at least 0.8" },
                    max: { args: [0.999], msg: "momentumDecay: Must be at most 0.999" },
                },
                get() {
                    const value = this.getDataValue("momentumDecay");
                    return value ? parseFloat(value.toString()) : 0.95;
                },
            },
            lastKnownPrice: {
                type: sequelize_1.DataTypes.DECIMAL(30, 18),
                allowNull: true,
                defaultValue: null,
                get() {
                    const value = this.getDataValue("lastKnownPrice");
                    return value ? parseFloat(value.toString()) : null;
                },
            },
            trendMomentum: {
                type: sequelize_1.DataTypes.DECIMAL(5, 4),
                allowNull: false,
                defaultValue: 0,
                validate: {
                    isDecimal: { msg: "trendMomentum: Must be a valid decimal number" },
                    min: { args: [-1], msg: "trendMomentum: Must be at least -1" },
                    max: { args: [1], msg: "trendMomentum: Must be at most 1" },
                },
                get() {
                    const value = this.getDataValue("trendMomentum");
                    return value ? parseFloat(value.toString()) : 0;
                },
            },
            lastMomentumUpdate: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
                defaultValue: null,
            },
        }, {
            sequelize,
            modelName: "aiMarketMaker",
            tableName: "ai_market_maker",
            timestamps: true,
            hooks: {
                beforeValidate: (instance) => {
                    const low = Number(instance.priceRangeLow) || 0;
                    const high = Number(instance.priceRangeHigh) || 0;
                    const target = Number(instance.targetPrice) || 0;
                    if (low > 0 && high > 0 && low >= high) {
                        throw new Error("priceRangeLow must be less than priceRangeHigh");
                    }
                    if (target > 0 && low > 0 && target < low) {
                        throw new Error("targetPrice must be greater than or equal to priceRangeLow");
                    }
                    if (target > 0 && high > 0 && target > high) {
                        throw new Error("targetPrice must be less than or equal to priceRangeHigh");
                    }
                },
                beforeSave: (instance) => {
                    const current = Number(instance.currentDailyVolume) || 0;
                    const max = Number(instance.maxDailyVolume) || 0;
                    if (max > 0 && current > max) {
                        console_1.logger.warn("AI_MM", `currentDailyVolume (${current}) exceeds maxDailyVolume (${max})`);
                    }
                },
            },
            indexes: [
                {
                    name: "PRIMARY",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "id" }],
                },
                {
                    name: "aiMarketMakerMarketIdKey",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "marketId" }],
                },
                {
                    name: "aiMarketMakerStatusIdx",
                    using: "BTREE",
                    fields: [{ name: "status" }],
                },
            ],
        });
    }
    static associate(models) {
        aiMarketMaker.hasOne(models.aiMarketMakerPool, {
            as: "pool",
            foreignKey: "marketMakerId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        aiMarketMaker.hasMany(models.aiBot, {
            as: "bots",
            foreignKey: "marketMakerId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        aiMarketMaker.hasMany(models.aiMarketMakerHistory, {
            as: "history",
            foreignKey: "marketMakerId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        aiMarketMaker.belongsTo(models.ecosystemMarket, {
            as: "market",
            foreignKey: "marketId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = aiMarketMaker;
