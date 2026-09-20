"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class hbStrategyPreset extends sequelize_1.Model {
    static initModel(sequelize) {
        return hbStrategyPreset.init({
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
            family: {
                type: sequelize_1.DataTypes.ENUM("pmm", "xemm"),
                allowNull: false,
            },
            pair: {
                type: sequelize_1.DataTypes.STRING(40),
                allowNull: false,
                validate: { notEmpty: { msg: "pair: must not be empty" } },
            },
            makerConnector: {
                type: sequelize_1.DataTypes.STRING(60),
                allowNull: false,
                defaultValue: "bicrypto",
            },
            takerConnector: {
                type: sequelize_1.DataTypes.STRING(60),
                allowNull: true,
            },
            config: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: false,
                defaultValue: {},
                get() {
                    const raw = this.getDataValue("config");
                    if (typeof raw !== "string")
                        return raw !== null && raw !== void 0 ? raw : {};
                    try {
                        return JSON.parse(raw);
                    }
                    catch (_a) {
                        return {};
                    }
                },
            },
            status: {
                type: sequelize_1.DataTypes.ENUM("draft", "published"),
                allowNull: false,
                defaultValue: "draft",
            },
            version: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 1,
            },
            createdBy: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
            },
        }, {
            sequelize,
            modelName: "hbStrategyPreset",
            tableName: "hb_strategy_preset",
            timestamps: true,
            indexes: [
                { name: "PRIMARY", unique: true, using: "BTREE", fields: [{ name: "id" }] },
                { name: "hbStrategyPresetStatusIdx", using: "BTREE", fields: [{ name: "status" }] },
                { name: "hbStrategyPresetFamilyIdx", using: "BTREE", fields: [{ name: "family" }] },
                { name: "hbStrategyPresetCreatedByIdx", using: "BTREE", fields: [{ name: "createdBy" }] },
            ],
        });
    }
    static associate(models) {
        hbStrategyPreset.belongsTo(models.user, {
            as: "creator",
            foreignKey: "createdBy",
            onDelete: "SET NULL",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = hbStrategyPreset;
