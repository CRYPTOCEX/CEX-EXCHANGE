"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class binaryAiEngineUserCooldown extends sequelize_1.Model {
    static initModel(sequelize) {
        return binaryAiEngineUserCooldown.init({
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
            userId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                validate: {
                    notEmpty: { msg: "userId: User ID must not be empty" },
                    isUUID: { args: 4, msg: "userId: Must be a valid UUID" },
                },
            },
            reason: {
                type: sequelize_1.DataTypes.ENUM("BIG_WIN", "STREAK", "MANUAL"),
                allowNull: false,
                defaultValue: "BIG_WIN",
            },
            triggerOrderId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
            },
            triggerAmount: {
                type: sequelize_1.DataTypes.DECIMAL(18, 8),
                allowNull: true,
                get() {
                    const value = this.getDataValue("triggerAmount");
                    return value !== null ? parseFloat(value) : null;
                },
            },
            winRateReduction: {
                type: sequelize_1.DataTypes.DECIMAL(5, 4),
                allowNull: false,
                validate: {
                    min: { args: [0], msg: "winRateReduction: Must be at least 0" },
                    max: { args: [0.5], msg: "winRateReduction: Must be at most 0.50 (50%)" },
                },
                get() {
                    const value = this.getDataValue("winRateReduction");
                    return value !== null ? parseFloat(value) : 0;
                },
            },
            startsAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: false,
            },
            expiresAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: false,
            },
            isActive: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: true,
            },
        }, {
            sequelize,
            modelName: "binaryAiEngineUserCooldown",
            tableName: "binary_ai_engine_user_cooldown",
            timestamps: true,
            indexes: [
                { fields: ["engineId", "userId"] },
                { fields: ["expiresAt"] },
                { fields: ["isActive"] },
                { fields: ["userId"] },
            ],
        });
    }
    static associate(models) {
        binaryAiEngineUserCooldown.belongsTo(models.binaryAiEngine, {
            foreignKey: "engineId",
            as: "engine",
            onDelete: "CASCADE",
        });
        if (models.user) {
            binaryAiEngineUserCooldown.belongsTo(models.user, {
                foreignKey: "userId",
                as: "user",
            });
        }
    }
}
exports.default = binaryAiEngineUserCooldown;
