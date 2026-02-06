"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class binaryAiEngineCorrelationAlert extends sequelize_1.Model {
    static initModel(sequelize) {
        return binaryAiEngineCorrelationAlert.init({
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
            symbol: {
                type: sequelize_1.DataTypes.STRING(20),
                allowNull: false,
                validate: {
                    notEmpty: { msg: "symbol: Symbol must not be empty" },
                },
            },
            internalPrice: {
                type: sequelize_1.DataTypes.DECIMAL(18, 8),
                allowNull: false,
                get() {
                    const value = this.getDataValue("internalPrice");
                    return value !== null ? parseFloat(value) : 0;
                },
            },
            externalPrice: {
                type: sequelize_1.DataTypes.DECIMAL(18, 8),
                allowNull: false,
                get() {
                    const value = this.getDataValue("externalPrice");
                    return value !== null ? parseFloat(value) : 0;
                },
            },
            deviationPercent: {
                type: sequelize_1.DataTypes.DECIMAL(7, 6),
                allowNull: false,
                get() {
                    const value = this.getDataValue("deviationPercent");
                    return value !== null ? parseFloat(value) : 0;
                },
            },
            priceSource: {
                type: sequelize_1.DataTypes.STRING(50),
                allowNull: true,
            },
            provider: {
                type: sequelize_1.DataTypes.STRING(50),
                allowNull: false,
            },
            message: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
            },
            resolved: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
            severity: {
                type: sequelize_1.DataTypes.ENUM("LOW", "MEDIUM", "HIGH", "CRITICAL"),
                allowNull: false,
                defaultValue: "MEDIUM",
            },
            status: {
                type: sequelize_1.DataTypes.ENUM("ACTIVE", "ACKNOWLEDGED", "RESOLVED"),
                allowNull: false,
                defaultValue: "ACTIVE",
            },
            acknowledgedBy: {
                type: sequelize_1.DataTypes.STRING(100),
                allowNull: true,
            },
            acknowledgedAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
            },
            resolvedBy: {
                type: sequelize_1.DataTypes.STRING(100),
                allowNull: true,
            },
            resolvedAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
            },
        }, {
            sequelize,
            modelName: "binaryAiEngineCorrelationAlert",
            tableName: "binary_ai_engine_correlation_alert",
            timestamps: true,
            indexes: [
                { fields: ["engineId"] },
                { fields: ["status"] },
                { fields: ["severity"] },
                { fields: ["createdAt"] },
                { fields: ["symbol"] },
            ],
        });
    }
    static associate(models) {
        binaryAiEngineCorrelationAlert.belongsTo(models.binaryAiEngine, {
            foreignKey: "engineId",
            as: "engine",
            onDelete: "CASCADE",
        });
    }
}
exports.default = binaryAiEngineCorrelationAlert;
