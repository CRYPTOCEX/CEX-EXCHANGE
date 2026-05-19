"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class gatewayApiKey extends sequelize_1.Model {
    static initModel(sequelize) {
        return gatewayApiKey.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            merchantId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                validate: {
                    isUUID: { args: 4, msg: "merchantId: Must be a valid UUID" },
                },
            },
            name: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: false,
                validate: {
                    notEmpty: { msg: "name: Key name must not be empty" },
                },
            },
            keyPrefix: {
                type: sequelize_1.DataTypes.STRING(20),
                allowNull: false,
                validate: {
                    isIn: {
                        args: [["pk_live_", "pk_test_", "sk_live_", "sk_test_"]],
                        msg: "keyPrefix: Must be a valid key prefix",
                    },
                },
            },
            keyHash: {
                type: sequelize_1.DataTypes.STRING(255),
                allowNull: false,
            },
            lastFourChars: {
                type: sequelize_1.DataTypes.STRING(4),
                allowNull: false,
            },
            type: {
                type: sequelize_1.DataTypes.ENUM("PUBLIC", "SECRET"),
                allowNull: false,
            },
            mode: {
                type: sequelize_1.DataTypes.ENUM("LIVE", "TEST"),
                allowNull: false,
            },
            permissions: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: false,
                defaultValue: [],
                get() {
                    const value = this.getDataValue("permissions");
                    return typeof value === "string" ? JSON.parse(value) : value;
                },
            },
            ipWhitelist: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: true,
                get() {
                    const value = this.getDataValue("ipWhitelist");
                    return typeof value === "string" ? JSON.parse(value) : value;
                },
            },
            allowedWalletTypes: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: true,
                get() {
                    const value = this.getDataValue("allowedWalletTypes");
                    return typeof value === "string" ? JSON.parse(value) : value;
                },
            },
            successUrl: {
                type: sequelize_1.DataTypes.STRING(500),
                allowNull: true,
            },
            cancelUrl: {
                type: sequelize_1.DataTypes.STRING(500),
                allowNull: true,
            },
            webhookUrl: {
                type: sequelize_1.DataTypes.STRING(500),
                allowNull: true,
            },
            lastUsedAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
            },
            lastUsedIp: {
                type: sequelize_1.DataTypes.STRING(45),
                allowNull: true,
            },
            status: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: true,
            },
            expiresAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
            },
        }, {
            sequelize,
            modelName: "gatewayApiKey",
            tableName: "gateway_api_key",
            timestamps: true,
            paranoid: true,
            indexes: [
                {
                    name: "PRIMARY",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "id" }],
                },
                {
                    name: "gatewayApiKeyMerchantIdFkey",
                    using: "BTREE",
                    fields: [{ name: "merchantId" }],
                },
                {
                    name: "gatewayApiKeyHashIdx",
                    using: "BTREE",
                    fields: [{ name: "keyHash" }],
                },
                {
                    name: "gatewayApiKeyStatusIdx",
                    using: "BTREE",
                    fields: [{ name: "status" }],
                },
            ],
        });
    }
    static associate(models) {
        gatewayApiKey.belongsTo(models.gatewayMerchant, {
            as: "merchant",
            foreignKey: "merchantId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = gatewayApiKey;
