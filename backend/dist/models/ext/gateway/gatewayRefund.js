"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class gatewayRefund extends sequelize_1.Model {
    static initModel(sequelize) {
        return gatewayRefund.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            paymentId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                validate: {
                    isUUID: { args: 4, msg: "paymentId: Must be a valid UUID" },
                },
            },
            merchantId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                validate: {
                    isUUID: { args: 4, msg: "merchantId: Must be a valid UUID" },
                },
            },
            transactionId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
            },
            refundId: {
                type: sequelize_1.DataTypes.STRING(64),
                allowNull: false,
            },
            amount: {
                type: sequelize_1.DataTypes.DECIMAL(30, 8),
                allowNull: false,
                validate: {
                    min: { args: [0.01], msg: "amount: Must be greater than 0" },
                },
                get() {
                    const value = this.getDataValue("amount");
                    return value ? parseFloat(value.toString()) : 0;
                },
            },
            currency: {
                type: sequelize_1.DataTypes.STRING(20),
                allowNull: false,
            },
            reason: {
                type: sequelize_1.DataTypes.ENUM("REQUESTED_BY_CUSTOMER", "DUPLICATE", "FRAUDULENT", "OTHER"),
                allowNull: false,
                defaultValue: "REQUESTED_BY_CUSTOMER",
            },
            description: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
            },
            status: {
                type: sequelize_1.DataTypes.ENUM("PENDING", "COMPLETED", "FAILED", "CANCELLED"),
                allowNull: false,
                defaultValue: "PENDING",
            },
            metadata: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: true,
                get() {
                    const value = this.getDataValue("metadata");
                    return typeof value === "string" ? JSON.parse(value) : value;
                },
            },
        }, {
            sequelize,
            modelName: "gatewayRefund",
            tableName: "gateway_refund",
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
                    name: "gatewayRefundIdUnique",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "refundId" }],
                },
                {
                    name: "gatewayRefundPaymentIdFkey",
                    using: "BTREE",
                    fields: [{ name: "paymentId" }],
                },
                {
                    name: "gatewayRefundMerchantIdFkey",
                    using: "BTREE",
                    fields: [{ name: "merchantId" }],
                },
                {
                    name: "gatewayRefundTransactionIdFkey",
                    using: "BTREE",
                    fields: [{ name: "transactionId" }],
                },
                {
                    name: "gatewayRefundStatusIdx",
                    using: "BTREE",
                    fields: [{ name: "status" }],
                },
            ],
        });
    }
    static associate(models) {
        gatewayRefund.belongsTo(models.gatewayPayment, {
            as: "payment",
            foreignKey: "paymentId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        gatewayRefund.belongsTo(models.gatewayMerchant, {
            as: "merchant",
            foreignKey: "merchantId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        gatewayRefund.belongsTo(models.transaction, {
            as: "transaction",
            foreignKey: "transactionId",
            onDelete: "SET NULL",
            onUpdate: "CASCADE",
        });
        gatewayRefund.hasMany(models.gatewayWebhook, {
            as: "gatewayWebhooks",
            foreignKey: "refundId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = gatewayRefund;
