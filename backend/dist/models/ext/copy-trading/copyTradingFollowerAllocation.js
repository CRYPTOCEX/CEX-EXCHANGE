"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class copyTradingFollowerAllocation extends sequelize_1.Model {
    static initModel(sequelize) {
        return copyTradingFollowerAllocation.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            followerId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                validate: {
                    notNull: { msg: "followerId: Follower ID is required" },
                },
            },
            symbol: {
                type: sequelize_1.DataTypes.STRING(20),
                allowNull: false,
            },
            baseAmount: {
                type: sequelize_1.DataTypes.FLOAT,
                allowNull: false,
                defaultValue: 0,
                validate: {
                    min: { args: [0], msg: "baseAmount: Cannot be negative" },
                },
            },
            baseUsedAmount: {
                type: sequelize_1.DataTypes.FLOAT,
                allowNull: false,
                defaultValue: 0,
            },
            quoteAmount: {
                type: sequelize_1.DataTypes.FLOAT,
                allowNull: false,
                defaultValue: 0,
                validate: {
                    min: { args: [0], msg: "quoteAmount: Cannot be negative" },
                },
            },
            quoteUsedAmount: {
                type: sequelize_1.DataTypes.FLOAT,
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
            modelName: "copyTradingFollowerAllocation",
            tableName: "copy_trading_follower_allocations",
            timestamps: true,
            indexes: [
                {
                    name: "PRIMARY",
                    unique: true,
                    fields: [{ name: "id" }],
                },
                {
                    name: "copy_trading_follower_alloc_unique",
                    unique: true,
                    fields: [{ name: "followerId" }, { name: "symbol" }],
                },
                {
                    name: "copy_trading_follower_alloc_follower_idx",
                    fields: [{ name: "followerId" }],
                },
                {
                    name: "copy_trading_follower_alloc_symbol_idx",
                    fields: [{ name: "symbol" }],
                },
            ],
        });
    }
    static associate(models) {
        copyTradingFollowerAllocation.belongsTo(models.copyTradingFollower, {
            foreignKey: "followerId",
            as: "follower",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = copyTradingFollowerAllocation;
