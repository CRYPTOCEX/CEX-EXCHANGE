"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class tradingBotAuditLog extends sequelize_1.Model {
    static initModel(sequelize) {
        return tradingBotAuditLog.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            entityType: {
                type: sequelize_1.DataTypes.ENUM("BOT", "TRADE", "ORDER", "STRATEGY", "PURCHASE"),
                allowNull: false,
                validate: {
                    isIn: {
                        args: [["BOT", "TRADE", "ORDER", "STRATEGY", "PURCHASE"]],
                        msg: "entityType: Must be a valid entity type",
                    },
                },
            },
            entityId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                validate: {
                    notEmpty: { msg: "entityId: Entity ID must not be empty" },
                    isUUID: { args: 4, msg: "entityId: Must be a valid UUID" },
                },
            },
            botId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
            },
            action: {
                type: sequelize_1.DataTypes.ENUM("BOT_CREATED", "BOT_UPDATED", "BOT_STARTED", "BOT_STOPPED", "BOT_PAUSED", "BOT_RESUMED", "BOT_DELETED", "BOT_ERROR", "TRADE_OPENED", "TRADE_CLOSED", "TRADE_FAILED", "ORDER_PLACED", "ORDER_CANCELLED", "ORDER_FILLED", "DAILY_LIMIT_REACHED", "DRAWDOWN_LIMIT_REACHED", "STOP_LOSS_TRIGGERED", "TAKE_PROFIT_TRIGGERED", "KILL_SWITCH_ACTIVATED", "FUNDS_ALLOCATED", "FUNDS_DEALLOCATED", "STRATEGY_PURCHASED", "STRATEGY_SUBMITTED", "STRATEGY_APPROVED", "STRATEGY_REJECTED", "ADMIN_FORCE_STOP", "ADMIN_CONFIG_CHANGE"),
                allowNull: false,
            },
            userId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
            },
            adminId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
            },
            isSystem: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
            oldValue: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: true,
            },
            newValue: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: true,
            },
            metadata: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: true,
            },
            reason: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
            },
            ipAddress: {
                type: sequelize_1.DataTypes.STRING(45),
                allowNull: true,
            },
            userAgent: {
                type: sequelize_1.DataTypes.STRING(255),
                allowNull: true,
            },
        }, {
            sequelize,
            modelName: "tradingBotAuditLog",
            tableName: "trading_bot_audit_log",
            timestamps: true,
            updatedAt: false,
            indexes: [
                {
                    name: "PRIMARY",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "id" }],
                },
                {
                    name: "tradingBotAuditLogEntityIdx",
                    using: "BTREE",
                    fields: [{ name: "entityType" }, { name: "entityId" }],
                },
                {
                    name: "tradingBotAuditLogBotIdIdx",
                    using: "BTREE",
                    fields: [{ name: "botId" }],
                },
                {
                    name: "tradingBotAuditLogUserIdIdx",
                    using: "BTREE",
                    fields: [{ name: "userId" }],
                },
                {
                    name: "tradingBotAuditLogActionIdx",
                    using: "BTREE",
                    fields: [{ name: "action" }],
                },
                {
                    name: "tradingBotAuditLogCreatedAtIdx",
                    using: "BTREE",
                    fields: [{ name: "createdAt" }],
                },
            ],
        });
    }
    static associate(models) {
        tradingBotAuditLog.belongsTo(models.tradingBot, {
            as: "bot",
            foreignKey: "botId",
            onDelete: "SET NULL",
            onUpdate: "CASCADE",
        });
        tradingBotAuditLog.belongsTo(models.user, {
            as: "user",
            foreignKey: "userId",
            onDelete: "SET NULL",
            onUpdate: "CASCADE",
        });
        tradingBotAuditLog.belongsTo(models.user, {
            as: "admin",
            foreignKey: "adminId",
            onDelete: "SET NULL",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = tradingBotAuditLog;
