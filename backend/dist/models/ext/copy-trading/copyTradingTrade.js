"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class copyTradingTrade extends sequelize_1.Model {
    static initModel(sequelize) {
        return copyTradingTrade.init({
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
            followerId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
            },
            leaderOrderId: {
                type: sequelize_1.DataTypes.STRING(100),
                allowNull: true,
            },
            followerOrderId: {
                type: sequelize_1.DataTypes.STRING(100),
                allowNull: true,
            },
            symbol: {
                type: sequelize_1.DataTypes.STRING(20),
                allowNull: false,
                validate: {
                    notEmpty: { msg: "symbol: Symbol is required" },
                },
            },
            marketType: {
                type: sequelize_1.DataTypes.ENUM("SPOT", "BINARY"),
                allowNull: false,
                defaultValue: "SPOT",
            },
            side: {
                type: sequelize_1.DataTypes.ENUM("BUY", "SELL", "RISE", "FALL", "HIGHER", "LOWER", "TOUCH", "NO_TOUCH", "CALL", "PUT", "UP", "DOWN"),
                allowNull: false,
            },
            type: {
                type: sequelize_1.DataTypes.ENUM("MARKET", "LIMIT", "RISE_FALL", "HIGHER_LOWER", "TOUCH_NO_TOUCH", "CALL_PUT", "TURBO"),
                allowNull: false,
                defaultValue: "MARKET",
            },
            binaryResult: {
                type: sequelize_1.DataTypes.ENUM("WIN", "LOSS", "DRAW"),
                allowNull: true,
            },
            expiresAt: {
                type: sequelize_1.DataTypes.DATE(3),
                allowNull: true,
            },
            amount: {
                type: sequelize_1.DataTypes.FLOAT,
                allowNull: false,
                validate: {
                    min: { args: [0], msg: "amount: Cannot be negative" },
                },
            },
            price: {
                type: sequelize_1.DataTypes.FLOAT,
                allowNull: false,
                validate: {
                    min: { args: [0], msg: "price: Cannot be negative" },
                },
            },
            cost: {
                type: sequelize_1.DataTypes.FLOAT,
                allowNull: false,
                defaultValue: 0,
            },
            fee: {
                type: sequelize_1.DataTypes.FLOAT,
                allowNull: false,
                defaultValue: 0,
            },
            feeCurrency: {
                type: sequelize_1.DataTypes.STRING(20),
                allowNull: false,
                defaultValue: "USDT",
            },
            executedAmount: {
                type: sequelize_1.DataTypes.FLOAT,
                allowNull: false,
                defaultValue: 0,
            },
            executedPrice: {
                type: sequelize_1.DataTypes.FLOAT,
                allowNull: false,
                defaultValue: 0,
            },
            slippage: {
                type: sequelize_1.DataTypes.FLOAT,
                allowNull: true,
            },
            latencyMs: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: true,
            },
            profit: {
                type: sequelize_1.DataTypes.FLOAT,
                allowNull: true,
            },
            profitPercent: {
                type: sequelize_1.DataTypes.FLOAT,
                allowNull: true,
            },
            profitCurrency: {
                type: sequelize_1.DataTypes.STRING(20),
                allowNull: true,
            },
            status: {
                type: sequelize_1.DataTypes.ENUM("PENDING", "PENDING_REPLICATION", "REPLICATED", "REPLICATION_FAILED", "OPEN", "CLOSED", "PARTIALLY_FILLED", "FAILED", "CANCELLED", "CLOSING"),
                allowNull: false,
                defaultValue: "PENDING",
            },
            closeOrderId: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: true,
            },
            errorMessage: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
            },
            isLeaderTrade: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
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
            closedAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
            },
        }, {
            sequelize,
            modelName: "copyTradingTrade",
            tableName: "copy_trading_trades",
            timestamps: true,
            indexes: [
                {
                    name: "PRIMARY",
                    unique: true,
                    fields: [{ name: "id" }],
                },
                {
                    name: "copy_trading_trades_leader_id_idx",
                    fields: [{ name: "leaderId" }],
                },
                {
                    name: "copy_trading_trades_follower_id_idx",
                    fields: [{ name: "followerId" }],
                },
                {
                    name: "copy_trading_trades_leader_order_id_idx",
                    fields: [{ name: "leaderOrderId" }],
                },
                {
                    name: "copy_trading_trades_follower_order_id_idx",
                    fields: [{ name: "followerOrderId" }],
                },
                {
                    name: "copy_trading_trades_market_type_idx",
                    fields: [{ name: "marketType" }],
                },
                {
                    name: "copy_trading_trades_symbol_idx",
                    fields: [{ name: "symbol" }],
                },
                {
                    name: "copy_trading_trades_status_idx",
                    fields: [{ name: "status" }],
                },
                {
                    name: "copy_trading_trades_created_at_idx",
                    fields: [{ name: "createdAt" }],
                },
                {
                    name: "copy_trading_trades_leader_created_idx",
                    fields: [{ name: "leaderId" }, { name: "createdAt" }],
                },
                {
                    name: "copy_trading_trades_follower_closed_at_idx",
                    fields: [{ name: "followerId" }, { name: "closedAt" }],
                },
            ],
        });
    }
    static associate(models) {
        copyTradingTrade.belongsTo(models.copyTradingLeader, {
            foreignKey: "leaderId",
            as: "leader",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        copyTradingTrade.belongsTo(models.copyTradingFollower, {
            foreignKey: "followerId",
            as: "follower",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = copyTradingTrade;
