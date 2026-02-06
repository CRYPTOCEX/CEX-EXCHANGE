"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class ecosystemMasterWallet extends sequelize_1.Model {
    static initModel(sequelize) {
        return ecosystemMasterWallet.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            chain: {
                type: sequelize_1.DataTypes.STRING(255),
                allowNull: false,
                validate: {
                    notEmpty: { msg: "chain: Chain must not be empty" },
                },
            },
            currency: {
                type: sequelize_1.DataTypes.STRING(255),
                allowNull: false,
                validate: {
                    notEmpty: { msg: "currency: Currency must not be empty" },
                },
            },
            address: {
                type: sequelize_1.DataTypes.STRING(255),
                allowNull: false,
                validate: {
                    notEmpty: { msg: "address: Address must not be empty" },
                },
            },
            balance: {
                type: sequelize_1.DataTypes.DOUBLE,
                allowNull: false,
                defaultValue: 0,
                validate: {
                    isNumeric: { msg: "balance: Balance must be a number" },
                },
            },
            data: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
            },
            status: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: true,
                validate: {
                    isBoolean: { msg: "status: Status must be a boolean value" },
                },
            },
            lastIndex: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
                validate: {
                    isInt: { msg: "lastIndex: Last index must be an integer" },
                },
            },
        }, {
            sequelize,
            modelName: "ecosystemMasterWallet",
            tableName: "ecosystem_master_wallet",
            timestamps: false,
            indexes: [
                {
                    name: "PRIMARY",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "id" }],
                },
                {
                    name: "ecosystemMasterWalletIdKey",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "id" }],
                },
                {
                    name: "ecosystemMasterWalletChainCurrencyKey",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "chain" }, { name: "currency" }],
                },
            ],
        });
    }
    static associate(models) {
        ecosystemMasterWallet.hasMany(models.ecosystemCustodialWallet, {
            as: "ecosystemCustodialWallets",
            foreignKey: "masterWalletId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = ecosystemMasterWallet;
