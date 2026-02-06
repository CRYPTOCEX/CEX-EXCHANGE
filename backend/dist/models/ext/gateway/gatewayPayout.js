"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class gatewayPayout extends sequelize_1.Model {
    static initModel(sequelize) {
        return gatewayPayout.init({
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
            transactionId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
            },
            payoutId: {
                type: sequelize_1.DataTypes.STRING(64),
                allowNull: false,
            },
            amount: {
                type: sequelize_1.DataTypes.DECIMAL(30, 8),
                allowNull: false,
                get() {
                    const value = this.getDataValue("amount");
                    return value ? parseFloat(value.toString()) : 0;
                },
            },
            currency: {
                type: sequelize_1.DataTypes.STRING(20),
                allowNull: false,
            },
            walletType: {
                type: sequelize_1.DataTypes.STRING(20),
                allowNull: false,
                defaultValue: "FIAT",
            },
            status: {
                type: sequelize_1.DataTypes.ENUM("PENDING", "PROCESSING", "COMPLETED", "FAILED", "CANCELLED"),
                allowNull: false,
                defaultValue: "PENDING",
            },
            periodStart: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: false,
            },
            periodEnd: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: false,
            },
            grossAmount: {
                type: sequelize_1.DataTypes.DECIMAL(30, 8),
                allowNull: false,
                defaultValue: 0,
                get() {
                    const value = this.getDataValue("grossAmount");
                    return value ? parseFloat(value.toString()) : 0;
                },
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
            paymentCount: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
            },
            refundCount: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
            },
            metadata: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: true,
                get() {
                    const value = this.getDataValue("metadata");
                    return typeof value === "string" ? JSON.parse(value) : value;
                },
            },
            processedAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
            },
        }, {
            sequelize,
            modelName: "gatewayPayout",
            tableName: "gateway_payout",
            timestamps: true,
            indexes: [
                {
                    name: "PRIMARY",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "id" }],
                },
                {
                    name: "gatewayPayoutIdUnique",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "payoutId" }],
                },
                {
                    name: "gatewayPayoutMerchantIdFkey",
                    using: "BTREE",
                    fields: [{ name: "merchantId" }],
                },
                {
                    name: "gatewayPayoutTransactionIdFkey",
                    using: "BTREE",
                    fields: [{ name: "transactionId" }],
                },
                {
                    name: "gatewayPayoutStatusIdx",
                    using: "BTREE",
                    fields: [{ name: "status" }],
                },
            ],
        });
    }
    static associate(models) {
        gatewayPayout.belongsTo(models.gatewayMerchant, {
            as: "merchant",
            foreignKey: "merchantId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        gatewayPayout.belongsTo(models.transaction, {
            as: "transaction",
            foreignKey: "transactionId",
            onDelete: "SET NULL",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = gatewayPayout;
