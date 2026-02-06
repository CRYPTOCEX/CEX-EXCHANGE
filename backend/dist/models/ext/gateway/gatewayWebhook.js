"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class gatewayWebhook extends sequelize_1.Model {
    static initModel(sequelize) {
        return gatewayWebhook.init({
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
            paymentId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
            },
            refundId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
            },
            eventType: {
                type: sequelize_1.DataTypes.STRING(100),
                allowNull: false,
                validate: {
                    isIn: {
                        args: [[
                                "payment.created",
                                "payment.completed",
                                "payment.failed",
                                "payment.cancelled",
                                "payment.expired",
                                "refund.created",
                                "refund.completed",
                                "refund.failed",
                            ]],
                        msg: "eventType: Must be a valid webhook event type",
                    },
                },
            },
            url: {
                type: sequelize_1.DataTypes.STRING(1000),
                allowNull: false,
                validate: {
                    isUrl: { msg: "url: Must be a valid URL" },
                },
            },
            payload: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: false,
                get() {
                    const value = this.getDataValue("payload");
                    return typeof value === "string" ? JSON.parse(value) : value;
                },
            },
            signature: {
                type: sequelize_1.DataTypes.STRING(255),
                allowNull: false,
            },
            status: {
                type: sequelize_1.DataTypes.ENUM("PENDING", "SENT", "FAILED", "RETRYING"),
                allowNull: false,
                defaultValue: "PENDING",
            },
            attempts: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
            },
            maxAttempts: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 5,
            },
            lastAttemptAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
            },
            nextRetryAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
            },
            responseStatus: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: true,
            },
            responseBody: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
            },
            responseTime: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: true,
            },
            errorMessage: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
            },
        }, {
            sequelize,
            modelName: "gatewayWebhook",
            tableName: "gateway_webhook",
            timestamps: true,
            indexes: [
                {
                    name: "PRIMARY",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "id" }],
                },
                {
                    name: "gatewayWebhookMerchantIdFkey",
                    using: "BTREE",
                    fields: [{ name: "merchantId" }],
                },
                {
                    name: "gatewayWebhookPaymentIdFkey",
                    using: "BTREE",
                    fields: [{ name: "paymentId" }],
                },
                {
                    name: "gatewayWebhookRefundIdFkey",
                    using: "BTREE",
                    fields: [{ name: "refundId" }],
                },
                {
                    name: "gatewayWebhookStatusIdx",
                    using: "BTREE",
                    fields: [{ name: "status" }],
                },
                {
                    name: "gatewayWebhookNextRetryIdx",
                    using: "BTREE",
                    fields: [{ name: "nextRetryAt" }],
                },
            ],
        });
    }
    static associate(models) {
        gatewayWebhook.belongsTo(models.gatewayMerchant, {
            as: "merchant",
            foreignKey: "merchantId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        gatewayWebhook.belongsTo(models.gatewayPayment, {
            as: "payment",
            foreignKey: "paymentId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        gatewayWebhook.belongsTo(models.gatewayRefund, {
            as: "refund",
            foreignKey: "refundId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = gatewayWebhook;
