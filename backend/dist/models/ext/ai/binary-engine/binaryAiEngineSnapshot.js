"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class binaryAiEngineSnapshot extends sequelize_1.Model {
    static initModel(sequelize) {
        return binaryAiEngineSnapshot.init({
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
                allowNull: true,
            },
            description: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
            },
            configData: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: true,
            },
            configSnapshot: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: false,
            },
            performanceSnapshot: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: true,
            },
            tierData: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: true,
            },
            isAutomatic: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
            reason: {
                type: sequelize_1.DataTypes.ENUM("AUTO", "MANUAL", "PRE_CHANGE"),
                allowNull: false,
                defaultValue: "MANUAL",
            },
            createdBy: {
                type: sequelize_1.DataTypes.STRING(100),
                allowNull: false,
                defaultValue: "SYSTEM",
            },
            notes: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
            },
        }, {
            sequelize,
            modelName: "binaryAiEngineSnapshot",
            tableName: "binary_ai_engine_snapshot",
            timestamps: true,
            indexes: [
                { fields: ["engineId"] },
                { fields: ["createdAt"] },
                { fields: ["reason"] },
            ],
        });
    }
    static associate(models) {
        binaryAiEngineSnapshot.belongsTo(models.binaryAiEngine, {
            foreignKey: "engineId",
            as: "engine",
            onDelete: "CASCADE",
        });
    }
}
exports.default = binaryAiEngineSnapshot;
