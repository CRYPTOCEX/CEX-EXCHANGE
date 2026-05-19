"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class binaryAiEngineAction extends sequelize_1.Model {
    static initModel(sequelize) {
        return binaryAiEngineAction.init({
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
            actionType: {
                type: sequelize_1.DataTypes.ENUM("PRICE_ADJUSTMENT", "OUTCOME_OVERRIDE", "PERIOD_RESET", "CONFIG_CHANGE", "ENGINE_CREATED", "ENGINE_START", "ENGINE_STOP", "ENGINE_PAUSE", "EMERGENCY_STOP", "MANUAL_OVERRIDE", "TIER_ADJUSTMENT", "COOLDOWN_APPLIED", "COOLDOWN_REMOVED", "WHALE_DETECTED", "WHALE_HANDLED", "SIMULATION_RUN", "ROLLBACK_EXECUTED", "CORRELATION_ALERT", "AB_TEST_STARTED", "AB_TEST_ENDED"),
                allowNull: false,
            },
            symbol: {
                type: sequelize_1.DataTypes.STRING(20),
                allowNull: true,
            },
            details: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: true,
            },
            previousValue: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: true,
            },
            newValue: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: true,
            },
            triggeredBy: {
                type: sequelize_1.DataTypes.STRING(100),
                allowNull: false,
                defaultValue: "SYSTEM",
            },
            isDemo: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
            isSimulated: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
            affectedUserId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
            },
        }, {
            sequelize,
            modelName: "binaryAiEngineAction",
            tableName: "binary_ai_engine_action",
            timestamps: true,
            indexes: [
                { fields: ["engineId"] },
                { fields: ["actionType"] },
                { fields: ["createdAt"] },
                { fields: ["isSimulated"] },
                { fields: ["affectedUserId"] },
                { fields: ["isDemo"] },
            ],
        });
    }
    static associate(models) {
        binaryAiEngineAction.belongsTo(models.binaryAiEngine, {
            foreignKey: "engineId",
            as: "engine",
            onDelete: "CASCADE",
        });
    }
}
exports.default = binaryAiEngineAction;
