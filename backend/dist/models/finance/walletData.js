"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class walletData extends sequelize_1.Model {
    static initModel(sequelize) {
        return walletData.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            walletId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                validate: {
                    isUUID: {
                        args: 4,
                        msg: "walletId: Wallet ID must be a valid UUID",
                    },
                },
                comment: "ID of the wallet this data belongs to",
            },
            currency: {
                type: sequelize_1.DataTypes.STRING(255),
                allowNull: false,
                validate: {
                    notEmpty: { msg: "currency: Currency cannot be empty" },
                },
                comment: "Currency symbol for this wallet data",
            },
            chain: {
                type: sequelize_1.DataTypes.STRING(255),
                allowNull: false,
                validate: {
                    notEmpty: { msg: "chain: Chain cannot be empty" },
                },
                comment: "Blockchain network name (e.g., ETH, BSC, TRX)",
            },
            balance: {
                type: sequelize_1.DataTypes.DOUBLE,
                allowNull: false,
                defaultValue: 0,
                validate: {
                    isFloat: { msg: "balance: Balance must be a number" },
                },
                comment: "Current balance for this currency on this chain",
            },
            index: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: true,
                validate: {
                    isInt: { msg: "index: Index must be an integer" },
                },
                comment: "Derivation index for HD wallet generation",
            },
            data: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: false,
                validate: {
                    notEmpty: { msg: "data: Data cannot be empty" },
                },
                comment: "Encrypted wallet data (private keys, addresses, etc.)",
            },
        }, {
            sequelize,
            modelName: "walletData",
            tableName: "wallet_data",
            timestamps: false,
            indexes: [
                {
                    name: "PRIMARY",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "id" }],
                },
                {
                    name: "walletDataWalletIdCurrencyChainKey",
                    unique: true,
                    using: "BTREE",
                    fields: [
                        { name: "walletId" },
                        { name: "currency" },
                        { name: "chain" },
                    ],
                },
            ],
        });
    }
    static associate(models) {
        walletData.belongsTo(models.wallet, {
            as: "wallet",
            foreignKey: "walletId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = walletData;
