"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class binaryAiEngine extends sequelize_1.Model {
    static initModel(sequelize) {
        return binaryAiEngine.init({
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
            status: {
                type: sequelize_1.DataTypes.ENUM("ACTIVE", "PAUSED", "STOPPED"),
                allowNull: false,
                defaultValue: "STOPPED",
            },
            targetUserWinRate: {
                type: sequelize_1.DataTypes.DECIMAL(5, 4),
                allowNull: false,
                defaultValue: 0.35,
                validate: {
                    min: { args: [0.25], msg: "targetUserWinRate: Must be at least 0.25" },
                    max: { args: [0.45], msg: "targetUserWinRate: Must be at most 0.45" },
                },
                get() {
                    const value = this.getDataValue("targetUserWinRate");
                    return value !== null ? parseFloat(value) : 0.35;
                },
            },
            winRateVariance: {
                type: sequelize_1.DataTypes.DECIMAL(5, 4),
                allowNull: false,
                defaultValue: 0.05,
                get() {
                    const value = this.getDataValue("winRateVariance");
                    return value !== null ? parseFloat(value) : 0.05;
                },
            },
            winRateResetHours: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 24,
            },
            practiceMode: {
                type: sequelize_1.DataTypes.ENUM("DISABLED", "SAME_AS_LIVE", "CUSTOM"),
                allowNull: false,
                defaultValue: "DISABLED",
            },
            practiceTargetWinRate: {
                type: sequelize_1.DataTypes.DECIMAL(5, 4),
                allowNull: false,
                defaultValue: 0.55,
                get() {
                    const value = this.getDataValue("practiceTargetWinRate");
                    return value !== null ? parseFloat(value) : 0.55;
                },
            },
            practiceWinRateVariance: {
                type: sequelize_1.DataTypes.DECIMAL(5, 4),
                allowNull: false,
                defaultValue: 0.1,
                get() {
                    const value = this.getDataValue("practiceWinRateVariance");
                    return value !== null ? parseFloat(value) : 0.1;
                },
            },
            optimizationStrategy: {
                type: sequelize_1.DataTypes.ENUM("CONSERVATIVE", "MODERATE", "AGGRESSIVE"),
                allowNull: false,
                defaultValue: "MODERATE",
            },
            maxPriceAdjustmentPercent: {
                type: sequelize_1.DataTypes.DECIMAL(7, 6),
                allowNull: false,
                defaultValue: 0.003,
                get() {
                    const value = this.getDataValue("maxPriceAdjustmentPercent");
                    return value !== null ? parseFloat(value) : 0.003;
                },
            },
            adjustmentLeadTimeSeconds: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 30,
            },
            volatilityMaskingEnabled: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: true,
            },
            volatilityNoisePercent: {
                type: sequelize_1.DataTypes.DECIMAL(7, 6),
                allowNull: false,
                defaultValue: 0.001,
                get() {
                    const value = this.getDataValue("volatilityNoisePercent");
                    return value !== null ? parseFloat(value) : 0.001;
                },
            },
            enableUserTiers: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
            tierCalculationMethod: {
                type: sequelize_1.DataTypes.ENUM("VOLUME", "DEPOSIT", "MANUAL"),
                allowNull: false,
                defaultValue: "VOLUME",
            },
            enableBigWinCooldown: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: true,
            },
            bigWinThreshold: {
                type: sequelize_1.DataTypes.DECIMAL(18, 8),
                allowNull: false,
                defaultValue: 1000.0,
                get() {
                    const value = this.getDataValue("bigWinThreshold");
                    return value !== null ? parseFloat(value) : 1000.0;
                },
            },
            cooldownDurationMinutes: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 60,
            },
            cooldownWinRateReduction: {
                type: sequelize_1.DataTypes.DECIMAL(5, 4),
                allowNull: false,
                defaultValue: 0.1,
                get() {
                    const value = this.getDataValue("cooldownWinRateReduction");
                    return value !== null ? parseFloat(value) : 0.1;
                },
            },
            enableWhaleDetection: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: true,
            },
            whaleThreshold: {
                type: sequelize_1.DataTypes.DECIMAL(18, 8),
                allowNull: false,
                defaultValue: 5000.0,
                get() {
                    const value = this.getDataValue("whaleThreshold");
                    return value !== null ? parseFloat(value) : 5000.0;
                },
            },
            whaleStrategy: {
                type: sequelize_1.DataTypes.ENUM("REDUCE_EXPOSURE", "ALERT_ONLY", "FORCE_LOSS"),
                allowNull: false,
                defaultValue: "REDUCE_EXPOSURE",
            },
            whaleWinRateCap: {
                type: sequelize_1.DataTypes.DECIMAL(5, 4),
                allowNull: false,
                defaultValue: 0.25,
                get() {
                    const value = this.getDataValue("whaleWinRateCap");
                    return value !== null ? parseFloat(value) : 0.25;
                },
            },
            whaleProfitMultiplier: {
                type: sequelize_1.DataTypes.DECIMAL(5, 2),
                allowNull: false,
                defaultValue: 1.5,
                get() {
                    const value = this.getDataValue("whaleProfitMultiplier");
                    return value !== null ? parseFloat(value) : 1.5;
                },
            },
            payoutMultiplier: {
                type: sequelize_1.DataTypes.DECIMAL(5, 2),
                allowNull: false,
                defaultValue: 0.85,
                get() {
                    const value = this.getDataValue("payoutMultiplier");
                    return value !== null ? parseFloat(value) : 0.85;
                },
            },
            emergencyStopLoss: {
                type: sequelize_1.DataTypes.DECIMAL(18, 8),
                allowNull: false,
                defaultValue: 50000.0,
                get() {
                    const value = this.getDataValue("emergencyStopLoss");
                    return value !== null ? parseFloat(value) : 50000.0;
                },
            },
            correlationConfig: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: true,
            },
            simulationMode: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
            logSimulatedActions: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: true,
            },
            enableExternalCorrelation: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
            externalPriceSource: {
                type: sequelize_1.DataTypes.STRING(50),
                allowNull: true,
            },
            maxDeviationPercent: {
                type: sequelize_1.DataTypes.DECIMAL(5, 4),
                allowNull: false,
                defaultValue: 0.05,
                get() {
                    const value = this.getDataValue("maxDeviationPercent");
                    return value !== null ? parseFloat(value) : 0.05;
                },
            },
            allowedOrderTypes: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: false,
                defaultValue: ["RISE_FALL"],
            },
            minPositionForOptimization: {
                type: sequelize_1.DataTypes.DECIMAL(18, 8),
                allowNull: false,
                defaultValue: 10.0,
                get() {
                    const value = this.getDataValue("minPositionForOptimization");
                    return value !== null ? parseFloat(value) : 10.0;
                },
            },
            maxDailyLoss: {
                type: sequelize_1.DataTypes.DECIMAL(18, 8),
                allowNull: false,
                defaultValue: 10000.0,
                get() {
                    const value = this.getDataValue("maxDailyLoss");
                    return value !== null ? parseFloat(value) : 10000.0;
                },
            },
            maxSingleOrderExposure: {
                type: sequelize_1.DataTypes.DECIMAL(18, 8),
                allowNull: false,
                defaultValue: 5000.0,
                get() {
                    const value = this.getDataValue("maxSingleOrderExposure");
                    return value !== null ? parseFloat(value) : 5000.0;
                },
            },
            currentPeriodWins: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
            },
            currentPeriodLosses: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
            },
            currentPeriodPlatformProfit: {
                type: sequelize_1.DataTypes.DECIMAL(18, 8),
                allowNull: false,
                defaultValue: 0.0,
                get() {
                    const value = this.getDataValue("currentPeriodPlatformProfit");
                    return value !== null ? parseFloat(value) : 0.0;
                },
            },
            lastPeriodResetAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: false,
                defaultValue: sequelize_1.DataTypes.NOW,
            },
            practicePeriodWins: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
            },
            practicePeriodLosses: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
            },
            lastPracticePeriodResetAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: false,
                defaultValue: sequelize_1.DataTypes.NOW,
            },
            lastSnapshotId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
            },
            mlModelWeights: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: true,
            },
            enableWhaleAlerts: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: true,
                defaultValue: false,
            },
        }, {
            sequelize,
            modelName: "binaryAiEngine",
            tableName: "binary_ai_engine",
            timestamps: true,
            indexes: [
                { fields: ["marketMakerId"], unique: true },
                { fields: ["status"] },
            ],
        });
    }
    static associate(models) {
        binaryAiEngine.belongsTo(models.aiMarketMaker, {
            foreignKey: "marketMakerId",
            as: "marketMaker",
        });
        binaryAiEngine.hasMany(models.binaryAiEnginePosition, {
            foreignKey: "engineId",
            as: "positions",
            onDelete: "CASCADE",
        });
        binaryAiEngine.hasMany(models.binaryAiEngineAction, {
            foreignKey: "engineId",
            as: "actions",
            onDelete: "CASCADE",
        });
        binaryAiEngine.hasMany(models.binaryAiEngineDailyStats, {
            foreignKey: "engineId",
            as: "dailyStats",
            onDelete: "CASCADE",
        });
        binaryAiEngine.hasMany(models.binaryAiEngineUserTier, {
            foreignKey: "engineId",
            as: "userTiers",
            onDelete: "CASCADE",
        });
        binaryAiEngine.hasMany(models.binaryAiEngineUserCooldown, {
            foreignKey: "engineId",
            as: "userCooldowns",
            onDelete: "CASCADE",
        });
        binaryAiEngine.hasMany(models.binaryAiEngineSnapshot, {
            foreignKey: "engineId",
            as: "snapshots",
            onDelete: "CASCADE",
        });
        binaryAiEngine.hasMany(models.binaryAiEngineSimulation, {
            foreignKey: "engineId",
            as: "simulations",
            onDelete: "CASCADE",
        });
        binaryAiEngine.hasMany(models.binaryAiEngineABTest, {
            foreignKey: "engineId",
            as: "abTests",
            onDelete: "CASCADE",
        });
        binaryAiEngine.hasMany(models.binaryAiEngineCohort, {
            foreignKey: "engineId",
            as: "cohorts",
            onDelete: "CASCADE",
        });
        binaryAiEngine.hasMany(models.binaryAiEngineCorrelationAlert, {
            foreignKey: "engineId",
            as: "correlationAlerts",
            onDelete: "CASCADE",
        });
    }
}
exports.default = binaryAiEngine;
