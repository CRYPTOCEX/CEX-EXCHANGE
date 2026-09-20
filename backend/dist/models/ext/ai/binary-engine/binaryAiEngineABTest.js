"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const model_validators_1 = require("@b/utils/model-validators");
class binaryAiEngineABTest extends sequelize_1.Model {
    static initModel(sequelize) {
        return binaryAiEngineABTest.init({
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
                    isUUID: { args: model_validators_1.ANY_UUID_VERSION, msg: "engineId: Must be a valid UUID" },
                },
            },
            name: {
                type: sequelize_1.DataTypes.STRING(100),
                allowNull: false,
                validate: {
                    notEmpty: { msg: "name: Name must not be empty" },
                },
            },
            description: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
            },
            status: {
                type: sequelize_1.DataTypes.ENUM("DRAFT", "RUNNING", "COMPLETED", "CANCELLED", "STOPPED", "PAUSED"),
                allowNull: false,
                defaultValue: "DRAFT",
            },
            startedAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
            },
            endedAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
            },
            controlConfig: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: false,
                get() {
                    const value = this.getDataValue("controlConfig");
                    if (value == null)
                        return {};
                    if (typeof value === "string") {
                        try {
                            return JSON.parse(value);
                        }
                        catch (_a) {
                            return {};
                        }
                    }
                    return value;
                },
            },
            variantConfig: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: false,
                get() {
                    const value = this.getDataValue("variantConfig");
                    if (value == null)
                        return {};
                    if (typeof value === "string") {
                        try {
                            return JSON.parse(value);
                        }
                        catch (_a) {
                            return {};
                        }
                    }
                    return value;
                },
            },
            trafficSplit: {
                type: sequelize_1.DataTypes.DECIMAL(3, 2),
                allowNull: false,
                defaultValue: 0.5,
                validate: {
                    min: { args: [0.1], msg: "trafficSplit: Must be at least 0.1 (10%)" },
                    max: { args: [0.9], msg: "trafficSplit: Must be at most 0.9 (90%)" },
                },
                get() {
                    const value = this.getDataValue("trafficSplit");
                    return value !== null ? parseFloat(value) : 0.5;
                },
            },
            controlOrders: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
            },
            controlWins: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
            },
            controlProfit: {
                type: sequelize_1.DataTypes.DECIMAL(18, 8),
                allowNull: false,
                defaultValue: 0,
                get() {
                    const value = this.getDataValue("controlProfit");
                    return value !== null ? parseFloat(value) : 0;
                },
            },
            variantOrders: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
            },
            variantWins: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
            },
            variantProfit: {
                type: sequelize_1.DataTypes.DECIMAL(18, 8),
                allowNull: false,
                defaultValue: 0,
                get() {
                    const value = this.getDataValue("variantProfit");
                    return value !== null ? parseFloat(value) : 0;
                },
            },
            winningVariant: {
                type: sequelize_1.DataTypes.ENUM("CONTROL", "VARIANT", "TIE", "INCONCLUSIVE"),
                allowNull: true,
            },
            confidenceLevel: {
                type: sequelize_1.DataTypes.DECIMAL(5, 4),
                allowNull: true,
                get() {
                    const value = this.getDataValue("confidenceLevel");
                    return value !== null ? parseFloat(value) : null;
                },
            },
            results: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: true,
                get() {
                    const value = this.getDataValue("results");
                    if (value == null)
                        return null;
                    if (typeof value === "string") {
                        try {
                            return JSON.parse(value);
                        }
                        catch (_a) {
                            return null;
                        }
                    }
                    return value;
                },
            },
            variants: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: true,
                get() {
                    const value = this.getDataValue("variants");
                    if (value == null)
                        return null;
                    if (typeof value === "string") {
                        try {
                            return JSON.parse(value);
                        }
                        catch (_a) {
                            return null;
                        }
                    }
                    return value;
                },
            },
            primaryMetric: {
                type: sequelize_1.DataTypes.STRING(100),
                allowNull: true,
            },
            targetSampleSize: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: true,
            },
            durationDays: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: true,
            },
        }, {
            sequelize,
            modelName: "binaryAiEngineABTest",
            tableName: "binary_ai_engine_ab_test",
            timestamps: true,
            indexes: [
                { fields: ["engineId"] },
                { fields: ["status"] },
                { fields: ["startedAt"] },
            ],
        });
    }
    static associate(models) {
        binaryAiEngineABTest.belongsTo(models.binaryAiEngine, {
            foreignKey: "engineId",
            as: "engine",
            onDelete: "CASCADE",
        });
    }
}
exports.default = binaryAiEngineABTest;
