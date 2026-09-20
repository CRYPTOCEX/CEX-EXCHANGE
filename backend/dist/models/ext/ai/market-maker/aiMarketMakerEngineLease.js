"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class aiMarketMakerEngineLease extends sequelize_1.Model {
    static initModel(sequelize) {
        return aiMarketMakerEngineLease.init({
            id: {
                type: sequelize_1.DataTypes.STRING(32),
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
        }, {
            sequelize,
            modelName: "aiMarketMakerEngineLease",
            tableName: "ai_market_maker_engine_lease",
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
exports.default = aiMarketMakerEngineLease;
