"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class binaryAiEngineSimulation extends sequelize_1.Model {
    static initModel(sequelize) {
        return binaryAiEngineSimulation.init({
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
            startedAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: false,
            },
            endedAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
            },
            status: {
                type: sequelize_1.DataTypes.ENUM("RUNNING", "COMPLETED", "CANCELLED"),
                allowNull: false,
                defaultValue: "RUNNING",
            },
            ordersAnalyzed: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
            },
            simulatedWins: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
            },
            simulatedLosses: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
            },
            simulatedProfit: {
                type: sequelize_1.DataTypes.DECIMAL(18, 8),
                allowNull: false,
                defaultValue: 0,
                get() {
                    const value = this.getDataValue("simulatedProfit");
                    return value !== null ? parseFloat(value) : 0;
                },
            },
            priceAdjustmentsWouldHaveMade: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
            },
            configUsed: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: true,
            },
            summary: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: true,
            },
        }, {
            sequelize,
            modelName: "binaryAiEngineSimulation",
            tableName: "binary_ai_engine_simulation",
            timestamps: true,
            indexes: [
                { fields: ["engineId"] },
                { fields: ["status"] },
                { fields: ["startedAt"] },
            ],
        });
    }
    static associate(models) {
        binaryAiEngineSimulation.belongsTo(models.binaryAiEngine, {
            foreignKey: "engineId",
            as: "engine",
            onDelete: "CASCADE",
        });
    }
}
exports.default = binaryAiEngineSimulation;
