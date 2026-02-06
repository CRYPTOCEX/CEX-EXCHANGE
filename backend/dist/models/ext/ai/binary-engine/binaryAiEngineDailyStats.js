"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class binaryAiEngineDailyStats extends sequelize_1.Model {
    static initModel(sequelize) {
        return binaryAiEngineDailyStats.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            engineId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                validate: {
                    notEmpty: { msg: "engineId: Engine ID must not be empty" },
                    isUUID: { args: 4, msg: "engineId: Must be a valid UUID" },
                },
            },
            date: {
                type: sequelize_1.DataTypes.DATEONLY,
                allowNull: false,
            },
            isDemo: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
            totalOrdersProcessed: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
            },
            totalWins: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
            },
            totalLosses: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
            },
            totalDraws: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
            },
            platformProfit: {
                type: sequelize_1.DataTypes.DECIMAL(18, 8),
                allowNull: false,
                defaultValue: 0.0,
                get() {
                    const value = this.getDataValue("platformProfit");
                    return value !== null ? parseFloat(value) : 0.0;
                },
            },
            effectiveUserWinRate: {
                type: sequelize_1.DataTypes.DECIMAL(5, 4),
                allowNull: false,
                defaultValue: 0.0,
                get() {
                    const value = this.getDataValue("effectiveUserWinRate");
                    return value !== null ? parseFloat(value) : 0.0;
                },
            },
            targetUserWinRate: {
                type: sequelize_1.DataTypes.DECIMAL(5, 4),
                allowNull: false,
                defaultValue: 0.0,
                get() {
                    const value = this.getDataValue("targetUserWinRate");
                    return value !== null ? parseFloat(value) : 0.0;
                },
            },
            profitMargin: {
                type: sequelize_1.DataTypes.DECIMAL(5, 4),
                allowNull: false,
                defaultValue: 0.0,
                get() {
                    const value = this.getDataValue("profitMargin");
                    return value !== null ? parseFloat(value) : 0.0;
                },
            },
            priceAdjustmentCount: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
            },
            avgAdjustmentPercent: {
                type: sequelize_1.DataTypes.DECIMAL(7, 6),
                allowNull: false,
                defaultValue: 0.0,
                get() {
                    const value = this.getDataValue("avgAdjustmentPercent");
                    return value !== null ? parseFloat(value) : 0.0;
                },
            },
            largestAdjustmentPercent: {
                type: sequelize_1.DataTypes.DECIMAL(7, 6),
                allowNull: false,
                defaultValue: 0.0,
                get() {
                    const value = this.getDataValue("largestAdjustmentPercent");
                    return value !== null ? parseFloat(value) : 0.0;
                },
            },
            whaleOrdersCount: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
            },
            cooldownsApplied: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
            },
            tierBreakdown: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: true,
            },
        }, {
            sequelize,
            modelName: "binaryAiEngineDailyStats",
            tableName: "binary_ai_engine_daily_stats",
            timestamps: true,
            indexes: [
                { fields: ["engineId", "date", "isDemo"], unique: true },
                { fields: ["date"] },
                { fields: ["engineId"] },
            ],
        });
    }
    static associate(models) {
        binaryAiEngineDailyStats.belongsTo(models.binaryAiEngine, {
            foreignKey: "engineId",
            as: "engine",
            onDelete: "CASCADE",
        });
    }
}
exports.default = binaryAiEngineDailyStats;
