"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const model_validators_1 = require("@b/utils/model-validators");
class apiKey extends sequelize_1.Model {
    static initModel(sequelize) {
        return apiKey.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            userId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
                validate: {
                    isUUID: { args: model_validators_1.ANY_UUID_VERSION, msg: "userId: Must be a valid UUID" },
                },
            },
            name: {
                type: sequelize_1.DataTypes.STRING(255),
                allowNull: false,
                validate: {
                    notEmpty: { msg: "name: API key name must not be empty" },
                },
            },
            key: {
                type: sequelize_1.DataTypes.STRING(255),
                allowNull: false,
                validate: {
                    notEmpty: { msg: "key: API key must not be empty" },
                },
            },
            secret: {
                type: sequelize_1.DataTypes.STRING(255),
                allowNull: true,
            },
            secretCreatedAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
            },
            type: {
                type: sequelize_1.DataTypes.ENUM("user", "plugin"),
                allowNull: false,
                defaultValue: "user",
            },
            permissions: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: false,
                defaultValue: [],
                get() {
                    const value = this.getDataValue("permissions");
                    if (value == null)
                        return [];
                    if (typeof value === "string") {
                        try {
                            return JSON.parse(value);
                        }
                        catch (_a) {
                            return [];
                        }
                    }
                    return value;
                },
            },
            ipRestriction: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
            ipWhitelist: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: false,
                defaultValue: [],
                get() {
                    const value = this.getDataValue("ipWhitelist");
                    if (value == null)
                        return [];
                    if (typeof value === "string") {
                        try {
                            return JSON.parse(value);
                        }
                        catch (_a) {
                            return [];
                        }
                    }
                    return value;
                },
            },
            lastUsedAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
            },
            lastUsedIp: {
                type: sequelize_1.DataTypes.STRING(64),
                allowNull: true,
            },
            expiresAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
            },
            disabled: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
            disabledAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
            },
            disabledReason: {
                type: sequelize_1.DataTypes.STRING(255),
                allowNull: true,
            },
            disabledBy: {
                type: sequelize_1.DataTypes.ENUM("user", "admin"),
                allowNull: true,
            },
            rateLimitOverride: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: true,
                get() {
                    const value = this.getDataValue("rateLimitOverride");
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
            modelName: "apiKey",
            tableName: "api_key",
            timestamps: true,
            paranoid: true,
            defaultScope: {
                attributes: { exclude: ["secret"] },
            },
            scopes: {
                withSecret: {},
            },
            indexes: [
                {
                    name: "PRIMARY",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "id" }],
                },
                {
                    name: "apiKeyKeyIdx",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "key" }],
                },
                {
                    name: "apiKeyUserIdIdx",
                    using: "BTREE",
                    fields: [{ name: "userId" }],
                },
            ],
        });
    }
    static associate(models) {
        apiKey.belongsTo(models.user, {
            as: "user",
            foreignKey: "userId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        apiKey.hasMany(models.apiKeyAuditLog, {
            as: "auditLogs",
            foreignKey: "apiKeyId",
            onDelete: "CASCADE",
        });
    }
}
exports.default = apiKey;
