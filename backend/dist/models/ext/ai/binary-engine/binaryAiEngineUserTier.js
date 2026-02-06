"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class binaryAiEngineUserTier extends sequelize_1.Model {
    get maxVolume() {
        return Number.MAX_SAFE_INTEGER;
    }
    static initModel(sequelize) {
        return binaryAiEngineUserTier.init({
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
            tierName: {
                type: sequelize_1.DataTypes.STRING(20),
                allowNull: false,
                validate: {
                    notEmpty: { msg: "tierName: Name must not be empty" },
                },
            },
            tierOrder: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
            },
            minVolume: {
                type: sequelize_1.DataTypes.DECIMAL(18, 8),
                allowNull: false,
                defaultValue: 0,
                get() {
                    const value = this.getDataValue("minVolume");
                    return value !== null ? parseFloat(value) : 0;
                },
            },
            minDeposit: {
                type: sequelize_1.DataTypes.DECIMAL(18, 8),
                allowNull: false,
                defaultValue: 0,
                get() {
                    const value = this.getDataValue("minDeposit");
                    return value !== null ? parseFloat(value) : 0;
                },
            },
            winRateBonus: {
                type: sequelize_1.DataTypes.DECIMAL(5, 4),
                allowNull: false,
                defaultValue: 0,
                validate: {
                    min: { args: [0], msg: "winRateBonus: Must be at least 0" },
                    max: { args: [0.2], msg: "winRateBonus: Must be at most 0.20 (20%)" },
                },
                get() {
                    const value = this.getDataValue("winRateBonus");
                    return value !== null ? parseFloat(value) : 0;
                },
            },
            description: {
                type: sequelize_1.DataTypes.STRING(255),
                allowNull: true,
            },
            isActive: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: true,
            },
        }, {
            sequelize,
            modelName: "binaryAiEngineUserTier",
            tableName: "binary_ai_engine_user_tier",
            timestamps: true,
            indexes: [
                { fields: ["engineId", "tierName"], unique: true },
                { fields: ["tierOrder"] },
                { fields: ["engineId"] },
            ],
        });
    }
    static associate(models) {
        binaryAiEngineUserTier.belongsTo(models.binaryAiEngine, {
            foreignKey: "engineId",
            as: "engine",
            onDelete: "CASCADE",
        });
    }
}
exports.default = binaryAiEngineUserTier;
