"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class copyTradingTransaction extends sequelize_1.Model {
    static initModel(sequelize) {
        return copyTradingTransaction.init({
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
                allowNull: true,
            },
            followerId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
            },
            tradeId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
            },
            type: {
                type: sequelize_1.DataTypes.ENUM("ALLOCATION", "DEALLOCATION", "PROFIT_SHARE", "TRADE_PROFIT", "TRADE_LOSS", "FEE", "REFUND"),
                allowNull: false,
            },
            amount: {
                type: sequelize_1.DataTypes.FLOAT,
                allowNull: false,
            },
            currency: {
                type: sequelize_1.DataTypes.STRING(20),
                allowNull: false,
                defaultValue: "USDT",
            },
            fee: {
                type: sequelize_1.DataTypes.FLOAT,
                allowNull: false,
                defaultValue: 0,
            },
            balanceBefore: {
                type: sequelize_1.DataTypes.FLOAT,
                allowNull: false,
                defaultValue: 0,
            },
            balanceAfter: {
                type: sequelize_1.DataTypes.FLOAT,
                allowNull: false,
                defaultValue: 0,
            },
            status: {
                type: sequelize_1.DataTypes.ENUM("PENDING", "COMPLETED", "FAILED"),
                allowNull: false,
                defaultValue: "COMPLETED",
            },
            description: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
            },
            metadata: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
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
            modelName: "copyTradingTransaction",
            tableName: "copy_trading_transactions",
            timestamps: true,
            indexes: [
                {
                    name: "PRIMARY",
                    unique: true,
                    fields: [{ name: "id" }],
                },
                {
                    name: "copy_trading_transactions_user_id_idx",
                    fields: [{ name: "userId" }],
                },
                {
                    name: "copy_trading_transactions_leader_id_idx",
                    fields: [{ name: "leaderId" }],
                },
                {
                    name: "copy_trading_transactions_follower_id_idx",
                    fields: [{ name: "followerId" }],
                },
                {
                    name: "copy_trading_transactions_trade_id_idx",
                    fields: [{ name: "tradeId" }],
                },
                {
                    name: "copy_trading_transactions_type_idx",
                    fields: [{ name: "type" }],
                },
                {
                    name: "copy_trading_transactions_status_idx",
                    fields: [{ name: "status" }],
                },
                {
                    name: "copy_trading_transactions_created_at_idx",
                    fields: [{ name: "createdAt" }],
                },
            ],
        });
    }
    static associate(models) {
        copyTradingTransaction.belongsTo(models.user, {
            foreignKey: "userId",
            as: "user",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        copyTradingTransaction.belongsTo(models.copyTradingLeader, {
            foreignKey: "leaderId",
            as: "leader",
            onDelete: "SET NULL",
            onUpdate: "CASCADE",
        });
        copyTradingTransaction.belongsTo(models.copyTradingFollower, {
            foreignKey: "followerId",
            as: "follower",
            onDelete: "SET NULL",
            onUpdate: "CASCADE",
        });
        copyTradingTransaction.belongsTo(models.copyTradingTrade, {
            foreignKey: "tradeId",
            as: "trade",
            onDelete: "SET NULL",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = copyTradingTransaction;
