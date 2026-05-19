"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class gatewayPayment extends sequelize_1.Model {
    static initModel(sequelize) {
        return gatewayPayment.init({
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
            customerId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
            },
            transactionId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
            },
            paymentIntentId: {
                type: sequelize_1.DataTypes.STRING(64),
                allowNull: false,
            },
            merchantOrderId: {
                type: sequelize_1.DataTypes.STRING(255),
                allowNull: true,
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
                validate: {
                    notEmpty: { msg: "currency: Currency must not be empty" },
                },
            },
            walletType: {
                type: sequelize_1.DataTypes.ENUM("FIAT", "SPOT", "ECO"),
                allowNull: false,
                defaultValue: "FIAT",
            },
            feeAmount: {
                type: sequelize_1.DataTypes.DECIMAL(30, 8),
                allowNull: false,
                defaultValue: 0,
                get() {
                    const value = this.getDataValue("feeAmount");
                    return value ? parseFloat(value.toString()) : 0;
                },
            },
            netAmount: {
                type: sequelize_1.DataTypes.DECIMAL(30, 8),
                allowNull: false,
                defaultValue: 0,
                get() {
                    const value = this.getDataValue("netAmount");
                    return value ? parseFloat(value.toString()) : 0;
                },
            },
            status: {
                type: sequelize_1.DataTypes.ENUM("PENDING", "PROCESSING", "COMPLETED", "FAILED", "CANCELLED", "EXPIRED", "REFUNDED", "PARTIALLY_REFUNDED"),
                allowNull: false,
                defaultValue: "PENDING",
            },
            checkoutUrl: {
                type: sequelize_1.DataTypes.STRING(1000),
                allowNull: false,
            },
            returnUrl: {
                type: sequelize_1.DataTypes.STRING(1000),
                allowNull: false,
                validate: {
                    isValidUrl(value) {
                        try {
                            new URL(value);
                        }
                        catch (_a) {
                            throw new Error("returnUrl: Must be a valid URL");
                        }
                    },
                },
            },
            cancelUrl: {
                type: sequelize_1.DataTypes.STRING(1000),
                allowNull: true,
            },
            webhookUrl: {
                type: sequelize_1.DataTypes.STRING(1000),
                allowNull: true,
            },
            description: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
            },
            metadata: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: true,
                get() {
                    const value = this.getDataValue("metadata");
                    return typeof value === "string" ? JSON.parse(value) : value;
                },
            },
            lineItems: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: true,
                get() {
                    const value = this.getDataValue("lineItems");
                    return typeof value === "string" ? JSON.parse(value) : value;
                },
            },
            customerEmail: {
                type: sequelize_1.DataTypes.STRING(255),
                allowNull: true,
                validate: {
                    isEmail: { msg: "customerEmail: Must be a valid email" },
                },
            },
            customerName: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: true,
            },
            billingAddress: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: true,
                get() {
                    const value = this.getDataValue("billingAddress");
                    return typeof value === "string" ? JSON.parse(value) : value;
                },
            },
            expiresAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: false,
            },
            completedAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
            },
            ipAddress: {
                type: sequelize_1.DataTypes.STRING(45),
                allowNull: true,
            },
            userAgent: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
            },
            allocations: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: true,
                comment: "Array of wallet allocations used for this payment",
                get() {
                    const value = this.getDataValue("allocations");
                    return typeof value === "string" ? JSON.parse(value) : value;
                },
            },
            testMode: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
        }, {
            sequelize,
            modelName: "gatewayPayment",
            tableName: "gateway_payment",
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
                    name: "gatewayPaymentIntentIdUnique",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "paymentIntentId" }],
                },
                {
                    name: "gatewayPaymentMerchantIdFkey",
                    using: "BTREE",
                    fields: [{ name: "merchantId" }],
                },
                {
                    name: "gatewayPaymentCustomerIdFkey",
                    using: "BTREE",
                    fields: [{ name: "customerId" }],
                },
                {
                    name: "gatewayPaymentTransactionIdFkey",
                    using: "BTREE",
                    fields: [{ name: "transactionId" }],
                },
                {
                    name: "gatewayPaymentStatusIdx",
                    using: "BTREE",
                    fields: [{ name: "status" }],
                },
                {
                    name: "gatewayPaymentMerchantOrderIdx",
                    using: "BTREE",
                    fields: [{ name: "merchantId" }, { name: "merchantOrderId" }],
                },
            ],
        });
    }
    static associate(models) {
        gatewayPayment.belongsTo(models.gatewayMerchant, {
            as: "merchant",
            foreignKey: "merchantId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        gatewayPayment.belongsTo(models.user, {
            as: "customer",
            foreignKey: "customerId",
            onDelete: "SET NULL",
            onUpdate: "CASCADE",
        });
        gatewayPayment.belongsTo(models.transaction, {
            as: "transaction",
            foreignKey: "transactionId",
            onDelete: "SET NULL",
            onUpdate: "CASCADE",
        });
        gatewayPayment.hasMany(models.gatewayRefund, {
            as: "gatewayRefunds",
            foreignKey: "paymentId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        gatewayPayment.hasMany(models.gatewayWebhook, {
            as: "gatewayWebhooks",
            foreignKey: "paymentId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = gatewayPayment;
