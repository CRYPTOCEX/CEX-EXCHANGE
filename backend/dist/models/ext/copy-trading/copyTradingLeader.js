"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class copyTradingLeader extends sequelize_1.Model {
    static initModel(sequelize) {
        return copyTradingLeader.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            userId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                unique: true,
                validate: {
                    notNull: { msg: "userId: User ID is required" },
                },
            },
            displayName: {
                type: sequelize_1.DataTypes.STRING(100),
                allowNull: false,
                validate: {
                    notEmpty: { msg: "displayName: Display name is required" },
                    len: {
                        args: [2, 100],
                        msg: "displayName: Must be between 2 and 100 characters",
                    },
                },
            },
            avatar: {
                type: sequelize_1.DataTypes.STRING(500),
                allowNull: true,
            },
            bio: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
            },
            tradingStyle: {
                type: sequelize_1.DataTypes.ENUM("SCALPING", "DAY_TRADING", "SWING", "POSITION"),
                allowNull: false,
                defaultValue: "DAY_TRADING",
            },
            riskLevel: {
                type: sequelize_1.DataTypes.ENUM("LOW", "MEDIUM", "HIGH"),
                allowNull: false,
                defaultValue: "MEDIUM",
            },
            profitSharePercent: {
                type: sequelize_1.DataTypes.FLOAT,
                allowNull: false,
                defaultValue: 10,
                validate: {
                    min: { args: [0], msg: "profitSharePercent: Cannot be negative" },
                    max: {
                        args: [50],
                        msg: "profitSharePercent: Cannot exceed 50%",
                    },
                },
            },
            minFollowAmount: {
                type: sequelize_1.DataTypes.FLOAT,
                allowNull: false,
                defaultValue: 100,
                validate: {
                    min: { args: [0], msg: "minFollowAmount: Cannot be negative" },
                },
            },
            maxFollowers: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 100,
                validate: {
                    min: { args: [1], msg: "maxFollowers: Must be at least 1" },
                },
            },
            status: {
                type: sequelize_1.DataTypes.ENUM("PENDING", "ACTIVE", "SUSPENDED", "REJECTED", "INACTIVE"),
                allowNull: false,
                defaultValue: "PENDING",
            },
            isPublic: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: true,
            },
            applicationNote: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
            },
            rejectionReason: {
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
            deletedAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
            },
        }, {
            sequelize,
            modelName: "copyTradingLeader",
            tableName: "copy_trading_leaders",
            timestamps: true,
            paranoid: true,
            indexes: [
                {
                    name: "PRIMARY",
                    unique: true,
                    fields: [{ name: "id" }],
                },
                {
                    name: "copy_trading_leaders_user_id_idx",
                    unique: true,
                    fields: [{ name: "userId" }],
                },
                {
                    name: "copy_trading_leaders_status_idx",
                    fields: [{ name: "status" }],
                },
                {
                    name: "copy_trading_leaders_is_public_idx",
                    fields: [{ name: "isPublic" }],
                },
            ],
        });
    }
    static associate(models) {
        copyTradingLeader.belongsTo(models.user, {
            foreignKey: "userId",
            as: "user",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        copyTradingLeader.hasMany(models.copyTradingFollower, {
            foreignKey: "leaderId",
            as: "followers",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        copyTradingLeader.hasMany(models.copyTradingTrade, {
            foreignKey: "leaderId",
            as: "trades",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        copyTradingLeader.hasMany(models.copyTradingTransaction, {
            foreignKey: "leaderId",
            as: "transactions",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        copyTradingLeader.hasMany(models.copyTradingLeaderMarket, {
            foreignKey: "leaderId",
            as: "markets",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = copyTradingLeader;
