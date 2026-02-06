"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class copyTradingFollower extends sequelize_1.Model {
    static initModel(sequelize) {
        return copyTradingFollower.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            userId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                validate: {
                    notNull: { msg: "userId: User ID is required" },
                },
            },
            leaderId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                validate: {
                    notNull: { msg: "leaderId: Leader ID is required" },
                },
            },
            copyMode: {
                type: sequelize_1.DataTypes.ENUM("PROPORTIONAL", "FIXED_AMOUNT", "FIXED_RATIO"),
                allowNull: false,
                defaultValue: "PROPORTIONAL",
            },
            fixedAmount: {
                type: sequelize_1.DataTypes.FLOAT,
                allowNull: true,
            },
            fixedRatio: {
                type: sequelize_1.DataTypes.FLOAT,
                allowNull: true,
            },
            maxDailyLoss: {
                type: sequelize_1.DataTypes.FLOAT,
                allowNull: true,
            },
            maxPositionSize: {
                type: sequelize_1.DataTypes.FLOAT,
                allowNull: true,
            },
            stopLossPercent: {
                type: sequelize_1.DataTypes.FLOAT,
                allowNull: true,
            },
            takeProfitPercent: {
                type: sequelize_1.DataTypes.FLOAT,
                allowNull: true,
            },
            status: {
                type: sequelize_1.DataTypes.ENUM("ACTIVE", "PAUSED", "STOPPED"),
                allowNull: false,
                defaultValue: "ACTIVE",
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
            deletedAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
            },
        }, {
            sequelize,
            modelName: "copyTradingFollower",
            tableName: "copy_trading_followers",
            timestamps: true,
            paranoid: true,
            indexes: [
                {
                    name: "PRIMARY",
                    unique: true,
                    fields: [{ name: "id" }],
                },
                {
                    name: "copy_trading_followers_user_leader_idx",
                    unique: true,
                    fields: [{ name: "userId" }, { name: "leaderId" }],
                },
                {
                    name: "copy_trading_followers_user_id_idx",
                    fields: [{ name: "userId" }],
                },
                {
                    name: "copy_trading_followers_leader_id_idx",
                    fields: [{ name: "leaderId" }],
                },
                {
                    name: "copy_trading_followers_status_idx",
                    fields: [{ name: "status" }],
                },
            ],
        });
    }
    static associate(models) {
        copyTradingFollower.belongsTo(models.user, {
            foreignKey: "userId",
            as: "user",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        copyTradingFollower.belongsTo(models.copyTradingLeader, {
            foreignKey: "leaderId",
            as: "leader",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        copyTradingFollower.hasMany(models.copyTradingTrade, {
            foreignKey: "followerId",
            as: "trades",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        copyTradingFollower.hasMany(models.copyTradingTransaction, {
            foreignKey: "followerId",
            as: "transactions",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        copyTradingFollower.hasMany(models.copyTradingFollowerAllocation, {
            foreignKey: "followerId",
            as: "allocations",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = copyTradingFollower;
