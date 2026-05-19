"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class ecosystemPrivateLedger extends sequelize_1.Model {
    static initModel(sequelize) {
        return ecosystemPrivateLedger.init({
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
                    notNull: { msg: "walletId: Wallet ID cannot be null" },
                    isUUID: {
                        args: 4,
                        msg: "walletId: Wallet ID must be a valid UUID",
                    },
                },
            },
            index: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                validate: {
                    isInt: { msg: "index: Index must be an integer" },
                },
            },
            currency: {
                type: sequelize_1.DataTypes.STRING(50),
                allowNull: false,
                validate: {
                    notEmpty: { msg: "currency: Currency must not be empty" },
                },
            },
            chain: {
                type: sequelize_1.DataTypes.STRING(50),
                allowNull: false,
                validate: {
                    notEmpty: { msg: "chain: Chain must not be empty" },
                },
            },
            network: {
                type: sequelize_1.DataTypes.STRING(50),
                allowNull: false,
                defaultValue: "mainnet",
                validate: {
                    notEmpty: { msg: "network: Network must not be empty" },
                },
            },
            offchainDifference: {
                type: sequelize_1.DataTypes.DOUBLE,
                allowNull: false,
                defaultValue: 0,
                validate: {
                    isNumeric: {
                        msg: "offchainDifference: Offchain Difference must be a number",
                    },
                },
            },
        }, {
            sequelize,
            modelName: "ecosystemPrivateLedger",
            tableName: "ecosystem_private_ledger",
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
                    name: "uniqueEcosystemPrivateLedger",
                    unique: true,
                    using: "BTREE",
                    fields: [
                        { name: "walletId" },
                        { name: "index" },
                        { name: "currency" },
                        { name: "chain" },
                        { name: "network" },
                    ],
                },
            ],
        });
    }
    static associate(models) {
        ecosystemPrivateLedger.belongsTo(models.wallet, {
            as: "wallet",
            foreignKey: "walletId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = ecosystemPrivateLedger;
