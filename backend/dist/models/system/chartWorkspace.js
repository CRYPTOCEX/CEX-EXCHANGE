"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const model_validators_1 = require("@b/utils/model-validators");
class chartWorkspace extends sequelize_1.Model {
    static initModel(sequelize) {
        return chartWorkspace.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            userId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                comment: "Owner of this workspace entry",
                validate: {
                    notNull: { msg: "userId: User ID cannot be null" },
                    isUUID: { args: model_validators_1.ANY_UUID_VERSION, msg: "userId: Must be a valid UUID" },
                },
            },
            key: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: false,
                comment: "Client-side storage key, e.g. binary-chart-drawings-BTC/USDT",
                validate: {
                    notEmpty: { msg: "key: Key cannot be empty" },
                },
            },
            value: {
                type: sequelize_1.DataTypes.TEXT("long"),
                allowNull: true,
                comment: "Opaque JSON written by the chart client",
            },
            version: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
                comment: "Monotonic write counter, for last-write detection",
            },
        }, {
            sequelize,
            modelName: "chartWorkspace",
            tableName: "chart_workspace",
            timestamps: true,
            paranoid: false,
            indexes: [
                {
                    name: "PRIMARY",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "id" }],
                },
                {
                    name: "chartWorkspaceUserKeyUnique",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "userId" }, { name: "key" }],
                },
            ],
        });
    }
    static associate(models) {
        chartWorkspace.belongsTo(models.user, {
            as: "user",
            foreignKey: "userId",
            onDelete: "CASCADE",
        });
    }
}
exports.default = chartWorkspace;
