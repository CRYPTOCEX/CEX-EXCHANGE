"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class engineLease extends sequelize_1.Model {
    static initModel(sequelize) {
        return engineLease.init({
            id: {
                type: sequelize_1.DataTypes.STRING(64),
                primaryKey: true,
                allowNull: false,
            },
            instanceId: {
                type: sequelize_1.DataTypes.STRING(64),
                allowNull: false,
                validate: {
                    notEmpty: { msg: "instanceId: Instance ID must not be empty" },
                },
            },
            hostname: {
                type: sequelize_1.DataTypes.STRING(255),
                allowNull: true,
            },
            pid: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: true,
            },
            expiresAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: false,
            },
            epoch: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
                comment: "Fencing token for ledger batches: read FOR UPDATE inside every tick, incremented on promotion",
            },
        }, {
            sequelize,
            modelName: "engineLease",
            tableName: "engine_lease",
            timestamps: true,
            indexes: [
                {
                    name: "PRIMARY",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "id" }],
                },
            ],
        });
    }
}
exports.default = engineLease;
