"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class copyTradingLeaderStats extends sequelize_1.Model {
    static initModel(sequelize) {
        return copyTradingLeaderStats.init({
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
            date: {
                type: sequelize_1.DataTypes.DATEONLY,
                allowNull: false,
            },
            trades: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
            },
            winningTrades: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
            },
            losingTrades: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
            },
            volume: {
                type: sequelize_1.DataTypes.FLOAT,
                allowNull: false,
                defaultValue: 0,
            },
            profit: {
                type: sequelize_1.DataTypes.FLOAT,
                allowNull: false,
                defaultValue: 0,
            },
            fees: {
                type: sequelize_1.DataTypes.FLOAT,
                allowNull: false,
                defaultValue: 0,
            },
            startEquity: {
                type: sequelize_1.DataTypes.FLOAT,
                allowNull: false,
                defaultValue: 0,
            },
            endEquity: {
                type: sequelize_1.DataTypes.FLOAT,
                allowNull: false,
                defaultValue: 0,
            },
            highEquity: {
                type: sequelize_1.DataTypes.FLOAT,
                allowNull: false,
                defaultValue: 0,
            },
            lowEquity: {
                type: sequelize_1.DataTypes.FLOAT,
                allowNull: false,
                defaultValue: 0,
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
            modelName: "copyTradingLeaderStats",
            tableName: "copy_trading_leader_stats",
            timestamps: true,
            indexes: [
                {
                    name: "PRIMARY",
                    unique: true,
                    fields: [{ name: "id" }],
                },
                {
                    name: "copy_trading_leader_stats_leader_date_idx",
                    unique: true,
                    fields: [{ name: "leaderId" }, { name: "date" }],
                },
                {
                    name: "copy_trading_leader_stats_leader_id_idx",
                    fields: [{ name: "leaderId" }],
                },
                {
                    name: "copy_trading_leader_stats_date_idx",
                    fields: [{ name: "date" }],
                },
            ],
        });
    }
    static associate(models) {
        copyTradingLeaderStats.belongsTo(models.copyTradingLeader, {
            foreignKey: "leaderId",
            as: "leader",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = copyTradingLeaderStats;
