"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class apiKeyAuditLog extends sequelize_1.Model {
    static initModel(sequelize) {
        return apiKeyAuditLog.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            apiKeyId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
            },
            userId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
            },
            action: {
                type: sequelize_1.DataTypes.STRING(64),
                allowNull: false,
            },
            ip: {
                type: sequelize_1.DataTypes.STRING(64),
                allowNull: true,
            },
            userAgent: {
                type: sequelize_1.DataTypes.STRING(512),
                allowNull: true,
            },
            routePath: {
                type: sequelize_1.DataTypes.STRING(255),
                allowNull: true,
            },
            method: {
                type: sequelize_1.DataTypes.STRING(16),
                allowNull: true,
            },
            statusCode: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: true,
            },
            metadata: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: true,
                get() {
                    const value = this.getDataValue("metadata");
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
        }, {
            sequelize,
            modelName: "apiKeyAuditLog",
            tableName: "api_key_audit_log",
            timestamps: true,
            paranoid: false,
            indexes: [
                {
                    name: "PRIMARY",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "id" }],
                },
                {
                    name: "apiKeyAuditLogApiKeyIdIdx",
                    using: "BTREE",
                    fields: [{ name: "apiKeyId" }],
                },
                {
                    name: "apiKeyAuditLogActionIdx",
                    using: "BTREE",
                    fields: [{ name: "action" }],
                },
                {
                    name: "apiKeyAuditLogCreatedAtIdx",
                    using: "BTREE",
                    fields: [{ name: "createdAt" }],
                },
            ],
        });
    }
    static associate(models) {
        apiKeyAuditLog.belongsTo(models.apiKey, {
            as: "apiKey",
            foreignKey: "apiKeyId",
            onDelete: "CASCADE",
        });
        apiKeyAuditLog.belongsTo(models.user, {
            as: "user",
            foreignKey: "userId",
            onDelete: "SET NULL",
        });
    }
}
exports.default = apiKeyAuditLog;
