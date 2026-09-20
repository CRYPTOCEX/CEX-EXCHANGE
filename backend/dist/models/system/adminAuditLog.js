"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class adminAuditLog extends sequelize_1.Model {
    static initModel(sequelize) {
        return adminAuditLog.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            userId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
                comment: "The admin who performed the action. Nullable: a few logged routes run unauthenticated (installer, cron-triggered maintenance), and losing the row entirely would be worse than recording an unattributed one.",
            },
            module: {
                type: sequelize_1.DataTypes.STRING(64),
                allowNull: false,
                comment: "The route's logModule, e.g. ADMIN_FIN, ADMIN_CRM, ADMIN_SYS",
            },
            title: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: false,
                comment: "The route's logTitle, e.g. 'Approve Withdrawal'",
            },
            method: {
                type: sequelize_1.DataTypes.STRING(10),
                allowNull: false,
            },
            path: {
                type: sequelize_1.DataTypes.STRING(255),
                allowNull: false,
                comment: "Request path with the query string stripped",
            },
            targetId: {
                type: sequelize_1.DataTypes.STRING(64),
                allowNull: true,
                comment: "The record the action was aimed at, lifted from the path's last id-shaped segment. Denormalised on purpose: it is what makes 'show me everything that touched this withdrawal' a single indexed lookup.",
            },
            targetIds: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: true,
                comment: "Every id a BULK route was aimed at. `targetId` holds the first of them so the indexed per-record lookup still resolves; this holds the whole list, because 'approved 40 withdrawals' has to be able to say which forty.",
                get() {
                    const value = this.getDataValue("targetIds");
                    if (value == null)
                        return null;
                    if (typeof value === "string") {
                        try {
                            return JSON.parse(value);
                        }
                        catch (_a) {
                            return null;
                        }
                    }
                    return value;
                },
            },
            status: {
                type: sequelize_1.DataTypes.ENUM("SUCCESS", "ERROR"),
                allowNull: false,
            },
            reason: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
                comment: "Operator-supplied justification, taken from a `reason` query param or body field. This is the slot the DataTable destructive-action dialog already fills.",
            },
            error: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
                comment: "Failure message when status is ERROR",
            },
            durationMs: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: true,
            },
            requestId: {
                type: sequelize_1.DataTypes.STRING(64),
                allowNull: true,
                comment: "Ties the row back to the console trace for the same request",
            },
            ip: {
                type: sequelize_1.DataTypes.STRING(45),
                allowNull: true,
                comment: "IPv6-length; where the action came from",
            },
            steps: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: true,
                comment: "The ctx.step() trail the handler emitted — the narrative of what the operation actually did.",
                get() {
                    const value = this.getDataValue("steps");
                    if (value == null)
                        return null;
                    if (typeof value === "string") {
                        try {
                            return JSON.parse(value);
                        }
                        catch (_a) {
                            return null;
                        }
                    }
                    return value;
                },
            },
            createdAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: false,
                defaultValue: sequelize_1.DataTypes.NOW,
            },
        }, {
            sequelize,
            modelName: "adminAuditLog",
            tableName: "admin_audit_log",
            timestamps: false,
            paranoid: false,
            indexes: [
                {
                    name: "idx_admin_audit_log_createdAt",
                    using: "BTREE",
                    fields: [{ name: "createdAt" }],
                },
                {
                    name: "idx_admin_audit_log_userId_createdAt",
                    using: "BTREE",
                    fields: [{ name: "userId" }, { name: "createdAt" }],
                },
                {
                    name: "idx_admin_audit_log_targetId",
                    using: "BTREE",
                    fields: [{ name: "targetId" }],
                },
                {
                    name: "idx_admin_audit_log_module",
                    using: "BTREE",
                    fields: [{ name: "module" }],
                },
            ],
        });
    }
    static associate(models) {
        adminAuditLog.belongsTo(models.user, {
            as: "user",
            foreignKey: "userId",
            constraints: false,
        });
    }
}
exports.default = adminAuditLog;
