"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class copyTradingLeaderMarket extends sequelize_1.Model {
    static initModel(sequelize) {
        return copyTradingLeaderMarket.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            leaderId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                validate: {
                    notNull: { msg: "leaderId: Leader ID is required" },
                },
            },
            symbol: {
                type: sequelize_1.DataTypes.STRING(20),
                allowNull: false,
                validate: {
                    notEmpty: { msg: "symbol: Symbol is required" },
                },
            },
            baseCurrency: {
                type: sequelize_1.DataTypes.STRING(10),
                allowNull: false,
            },
            quoteCurrency: {
                type: sequelize_1.DataTypes.STRING(10),
                allowNull: false,
            },
            minBase: {
                type: sequelize_1.DataTypes.DOUBLE,
                allowNull: false,
                defaultValue: 0,
            },
            minQuote: {
                type: sequelize_1.DataTypes.DOUBLE,
                allowNull: false,
                defaultValue: 0,
            },
            isActive: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: true,
            },
            createdAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: false,
                defaultValue: sequelize_1.DataTypes.NOW,
            },
            updatedAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: false,
                defaultValue: sequelize_1.DataTypes.NOW,
            },
        }, {
            sequelize,
            modelName: "copyTradingLeaderMarket",
            tableName: "copy_trading_leader_markets",
            timestamps: true,
            indexes: [
                {
                    name: "PRIMARY",
                    unique: true,
                    fields: [{ name: "id" }],
                },
                {
                    name: "copy_trading_leader_markets_unique",
                    unique: true,
                    fields: [{ name: "leaderId" }, { name: "symbol" }],
                },
                {
                    name: "copy_trading_leader_markets_leader_idx",
                    fields: [{ name: "leaderId" }],
                },
                {
                    name: "copy_trading_leader_markets_symbol_idx",
                    fields: [{ name: "symbol" }],
                },
            ],
        });
    }
    static associate(models) {
        copyTradingLeaderMarket.belongsTo(models.copyTradingLeader, {
            foreignKey: "leaderId",
            as: "leader",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = copyTradingLeaderMarket;
