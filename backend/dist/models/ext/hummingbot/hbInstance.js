"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class hbInstance extends sequelize_1.Model {
    static initModel(sequelize) {
        return hbInstance.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            name: {
                type: sequelize_1.DataTypes.STRING(120),
                allowNull: false,
                validate: { notEmpty: { msg: "name: must not be empty" } },
            },
            description: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
            },
            installPath: {
                type: sequelize_1.DataTypes.STRING(500),
                allowNull: false,
                validate: { notEmpty: { msg: "installPath: must not be empty" } },
            },
            pythonPath: {
                type: sequelize_1.DataTypes.STRING(500),
                allowNull: false,
                validate: { notEmpty: { msg: "pythonPath: must not be empty" } },
            },
            presetId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
            },
            tradingPair: {
                type: sequelize_1.DataTypes.STRING(40),
                allowNull: true,
            },
            controllerConfig: {
                type: sequelize_1.DataTypes.STRING(300),
                allowNull: false,
                defaultValue: "",
            },
            apiKeyId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
            },
            baseUrl: {
                type: sequelize_1.DataTypes.STRING(300),
                allowNull: false,
                defaultValue: "",
            },
            configPassword: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
            },
            paperTrade: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
            paperBalances: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: true,
                get() {
                    const value = this.getDataValue("paperBalances");
                    if (value == null)
                        return null;
                    if (typeof value === "string") {
                        try {
                            const parsed = JSON.parse(value);
                            return parsed && typeof parsed === "object" ? parsed : null;
                        }
                        catch (_a) {
                            return null;
                        }
                    }
                    return typeof value === "object" ? value : null;
                },
            },
            desiredStatus: {
                type: sequelize_1.DataTypes.ENUM("RUNNING", "STOPPED"),
                allowNull: false,
                defaultValue: "STOPPED",
            },
            restartRequestedAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
            },
            status: {
                type: sequelize_1.DataTypes.ENUM("STOPPED", "STARTING", "RUNNING", "STOPPING", "CRASHED"),
                allowNull: false,
                defaultValue: "STOPPED",
            },
            pid: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: true,
            },
            autoRestart: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
            memoryLimitMb: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 1536,
            },
            restartCount: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
            },
            lastStartedAt: { type: sequelize_1.DataTypes.DATE, allowNull: true },
            lastStoppedAt: { type: sequelize_1.DataTypes.DATE, allowNull: true },
            lastExitCode: { type: sequelize_1.DataTypes.INTEGER, allowNull: true },
            lastError: { type: sequelize_1.DataTypes.TEXT, allowNull: true },
            createdBy: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
            },
        }, {
            sequelize,
            modelName: "hbInstance",
            tableName: "hb_instance",
            timestamps: true,
            indexes: [
                {
                    name: "PRIMARY",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "id" }],
                },
                {
                    name: "hbInstanceStatusIdx",
                    using: "BTREE",
                    fields: [{ name: "status" }],
                },
                {
                    name: "hbInstancePresetIdx",
                    using: "BTREE",
                    fields: [{ name: "presetId" }],
                },
                {
                    name: "hbInstanceApiKeyIdx",
                    using: "BTREE",
                    fields: [{ name: "apiKeyId" }],
                },
            ],
        });
    }
    static associate(models) {
        hbInstance.belongsTo(models.hbStrategyPreset, {
            as: "preset",
            foreignKey: "presetId",
            onDelete: "SET NULL",
            onUpdate: "CASCADE",
        });
        hbInstance.belongsTo(models.apiKey, {
            as: "apiKey",
            foreignKey: "apiKeyId",
            onDelete: "SET NULL",
            onUpdate: "CASCADE",
        });
        hbInstance.belongsTo(models.user, {
            as: "creator",
            foreignKey: "createdBy",
            onDelete: "SET NULL",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = hbInstance;
