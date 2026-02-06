"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class gatewayMerchantBalance extends sequelize_1.Model {
    static initModel(sequelize) {
        return gatewayMerchantBalance.init({
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
            currency: {
                type: sequelize_1.DataTypes.STRING(20),
                allowNull: false,
            },
            walletType: {
                type: sequelize_1.DataTypes.ENUM("FIAT", "SPOT", "ECO"),
                allowNull: false,
                defaultValue: "FIAT",
            },
            available: {
                type: sequelize_1.DataTypes.DECIMAL(30, 8),
                allowNull: false,
                defaultValue: 0,
                get() {
                    const value = this.getDataValue("available");
                    return value ? parseFloat(value.toString()) : 0;
                },
            },
            pending: {
                type: sequelize_1.DataTypes.DECIMAL(30, 8),
                allowNull: false,
                defaultValue: 0,
                get() {
                    const value = this.getDataValue("pending");
                    return value ? parseFloat(value.toString()) : 0;
                },
            },
            reserved: {
                type: sequelize_1.DataTypes.DECIMAL(30, 8),
                allowNull: false,
                defaultValue: 0,
                get() {
                    const value = this.getDataValue("reserved");
                    return value ? parseFloat(value.toString()) : 0;
                },
            },
            totalReceived: {
                type: sequelize_1.DataTypes.DECIMAL(30, 8),
                allowNull: false,
                defaultValue: 0,
                get() {
                    const value = this.getDataValue("totalReceived");
                    return value ? parseFloat(value.toString()) : 0;
                },
            },
            totalRefunded: {
                type: sequelize_1.DataTypes.DECIMAL(30, 8),
                allowNull: false,
                defaultValue: 0,
                get() {
                    const value = this.getDataValue("totalRefunded");
                    return value ? parseFloat(value.toString()) : 0;
                },
            },
            totalFees: {
                type: sequelize_1.DataTypes.DECIMAL(30, 8),
                allowNull: false,
                defaultValue: 0,
                get() {
                    const value = this.getDataValue("totalFees");
                    return value ? parseFloat(value.toString()) : 0;
                },
            },
            totalPaidOut: {
                type: sequelize_1.DataTypes.DECIMAL(30, 8),
                allowNull: false,
                defaultValue: 0,
                get() {
                    const value = this.getDataValue("totalPaidOut");
                    return value ? parseFloat(value.toString()) : 0;
                },
            },
        }, {
            sequelize,
            modelName: "gatewayMerchantBalance",
            tableName: "gateway_merchant_balance",
            timestamps: true,
            createdAt: false,
            indexes: [
                {
                    name: "PRIMARY",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "id" }],
                },
                {
                    name: "gatewayMerchantBalanceUnique",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "merchantId" }, { name: "currency" }, { name: "walletType" }],
                },
                {
                    name: "gatewayMerchantBalanceMerchantIdFkey",
                    using: "BTREE",
                    fields: [{ name: "merchantId" }],
                },
            ],
        });
    }
    static associate(models) {
        gatewayMerchantBalance.belongsTo(models.gatewayMerchant, {
            as: "merchant",
            foreignKey: "merchantId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = gatewayMerchantBalance;
