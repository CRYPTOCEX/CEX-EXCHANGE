"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class binaryAiEngineCohort extends sequelize_1.Model {
    static initModel(sequelize) {
        return binaryAiEngineCohort.init({
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
            name: {
                type: sequelize_1.DataTypes.STRING(100),
                allowNull: false,
                validate: {
                    notEmpty: { msg: "name: Cohort name must not be empty" },
                },
            },
            type: {
                type: sequelize_1.DataTypes.ENUM("SIGNUP_DATE", "DEPOSIT_AMOUNT", "TRADE_FREQUENCY", "CUSTOM"),
                allowNull: false,
            },
            startDate: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
            },
            endDate: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
            },
            minValue: {
                type: sequelize_1.DataTypes.DECIMAL(18, 8),
                allowNull: true,
                get() {
                    const value = this.getDataValue("minValue");
                    return value !== null ? parseFloat(value) : null;
                },
            },
            maxValue: {
                type: sequelize_1.DataTypes.DECIMAL(18, 8),
                allowNull: true,
                get() {
                    const value = this.getDataValue("maxValue");
                    return value !== null ? parseFloat(value) : null;
                },
            },
            criteria: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: true,
            },
            userCount: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
            },
            totalOrders: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
            },
            totalWins: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
            },
            avgWinRate: {
                type: sequelize_1.DataTypes.DECIMAL(5, 4),
                allowNull: false,
                defaultValue: 0,
                get() {
                    const value = this.getDataValue("avgWinRate");
                    return value !== null ? parseFloat(value) : 0;
                },
            },
            totalProfit: {
                type: sequelize_1.DataTypes.DECIMAL(18, 8),
                allowNull: false,
                defaultValue: 0,
                get() {
                    const value = this.getDataValue("totalProfit");
                    return value !== null ? parseFloat(value) : 0;
                },
            },
            lastCalculatedAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
            },
        }, {
            sequelize,
            modelName: "binaryAiEngineCohort",
            tableName: "binary_ai_engine_cohort",
            timestamps: true,
            indexes: [
                { fields: ["engineId"] },
                { fields: ["type"] },
                { fields: ["name"] },
            ],
        });
    }
    static associate(models) {
        binaryAiEngineCohort.belongsTo(models.binaryAiEngine, {
            foreignKey: "engineId",
            as: "engine",
            onDelete: "CASCADE",
        });
    }
}
exports.default = binaryAiEngineCohort;
