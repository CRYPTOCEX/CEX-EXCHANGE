"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class ecosystemCustodialWallet extends sequelize_1.Model {
    static initModel(sequelize) {
        return ecosystemCustodialWallet.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            masterWalletId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                validate: {
                    notNull: { msg: "masterWalletId: Master Wallet ID cannot be null" },
                    isUUID: {
                        args: 4,
                        msg: "masterWalletId: Master Wallet ID must be a valid UUID",
                    },
                },
            },
            address: {
                type: sequelize_1.DataTypes.STRING(255),
                allowNull: false,
                unique: "ecosystemCustodialWalletAddressKey",
                validate: {
                    notEmpty: { msg: "address: Address must not be empty" },
                },
            },
            chain: {
                type: sequelize_1.DataTypes.STRING(255),
                allowNull: false,
                validate: {
                    notEmpty: { msg: "chain: Chain must not be empty" },
                },
            },
            network: {
                type: sequelize_1.DataTypes.STRING(255),
                allowNull: false,
                defaultValue: "mainnet",
                validate: {
                    notEmpty: { msg: "network: Network must not be empty" },
                },
            },
            status: {
                type: sequelize_1.DataTypes.ENUM("ACTIVE", "INACTIVE", "SUSPENDED"),
                allowNull: false,
                defaultValue: "ACTIVE",
                validate: {
                    isIn: {
                        args: [["ACTIVE", "INACTIVE", "SUSPENDED"]],
                        msg: "status: Status must be either 'ACTIVE', 'INACTIVE', or 'SUSPENDED'",
                    },
                },
            },
        }, {
            sequelize,
            modelName: "ecosystemCustodialWallet",
            tableName: "ecosystem_custodial_wallet",
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
                    name: "ecosystemCustodialWalletIdKey",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "id" }],
                },
                {
                    name: "ecosystemCustodialWalletAddressKey",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "address" }],
                },
                {
                    name: "custodialWalletMasterWalletIdIdx",
                    using: "BTREE",
                    fields: [{ name: "masterWalletId" }],
                },
            ],
        });
    }
    static associate(models) {
        ecosystemCustodialWallet.belongsTo(models.ecosystemMasterWallet, {
            as: "masterWallet",
            foreignKey: "masterWalletId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = ecosystemCustodialWallet;
