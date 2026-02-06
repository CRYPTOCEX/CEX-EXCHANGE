"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class binaryAiEngineCorrelationHistory extends sequelize_1.Model {
    static initModel(sequelize) {
        return binaryAiEngineCorrelationHistory.init({
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
                type: sequelize_1.DataTypes.STRING(50),
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
                type: sequelize_1.DataTypes.DECIMAL(8, 4),
                allowNull: false,
                get() {
                    const value = this.getDataValue("deviationPercent");
                    return value !== null ? parseFloat(value) : 0;
                },
            },
            provider: {
                type: sequelize_1.DataTypes.STRING(50),
                allowNull: false,
                validate: {
                    notEmpty: { msg: "provider: Provider must not be empty" },
                },
            },
            timestamp: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: false,
                defaultValue: sequelize_1.DataTypes.NOW,
            },
        }, {
            sequelize,
            modelName: "binaryAiEngineCorrelationHistory",
            tableName: "binary_ai_engine_correlation_history",
            timestamps: true,
            indexes: [
                { fields: ["engineId"] },
                { fields: ["symbol"] },
                { fields: ["provider"] },
                { fields: ["timestamp"] },
                { fields: ["engineId", "symbol", "timestamp"] },
            ],
        });
    }
    static associate(models) {
        binaryAiEngineCorrelationHistory.belongsTo(models.binaryAiEngine, {
            foreignKey: "engineId",
            as: "engine",
            onDelete: "CASCADE",
        });
    }
}
exports.default = binaryAiEngineCorrelationHistory;
