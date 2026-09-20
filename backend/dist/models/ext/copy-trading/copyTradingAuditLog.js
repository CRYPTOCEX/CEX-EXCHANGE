"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class copyTradingAuditLog extends sequelize_1.Model {
    static initModel(sequelize) {
        return copyTradingAuditLog.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            entityType: {
                type: sequelize_1.DataTypes.STRING(100),
                allowNull: false,
            },
            entityId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
            },
            action: {
                type: sequelize_1.DataTypes.STRING(100),
                allowNull: false,
            },
            oldValue: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
            },
            newValue: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
            },
            userId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
            },
            adminId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
            },
            ipAddress: {
                type: sequelize_1.DataTypes.STRING(45),
                allowNull: true,
            },
            userAgent: {
                type: sequelize_1.DataTypes.STRING(500),
                allowNull: true,
            },
            reason: {
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
        }, {
            sequelize,
            modelName: "copyTradingAuditLog",
            tableName: "copy_trading_audit_logs",
            timestamps: false,
            indexes: [
                {
                    name: "PRIMARY",
                    unique: true,
                    fields: [{ name: "id" }],
                },
                {
                    name: "copy_trading_audit_logs_entity_idx",
                    fields: [{ name: "entityType" }, { name: "entityId" }],
                },
                {
                    name: "copy_trading_audit_logs_action_idx",
                    fields: [{ name: "action" }],
                },
                {
                    name: "copy_trading_audit_logs_user_id_idx",
                    fields: [{ name: "userId" }],
                },
                {
                    name: "copy_trading_audit_logs_admin_id_idx",
                    fields: [{ name: "adminId" }],
                },
                {
                    name: "copy_trading_audit_logs_created_at_idx",
                    fields: [{ name: "createdAt" }],
                },
            ],
        });
    }
    static associate(models) {
        copyTradingAuditLog.belongsTo(models.user, {
            foreignKey: "userId",
            as: "user",
            onDelete: "SET NULL",
            onUpdate: "CASCADE",
        });
        copyTradingAuditLog.belongsTo(models.user, {
            foreignKey: "adminId",
            as: "admin",
            onDelete: "SET NULL",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = copyTradingAuditLog;
