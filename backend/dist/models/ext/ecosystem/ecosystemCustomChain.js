"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class ecosystemCustomChain extends sequelize_1.Model {
    static initModel(sequelize) {
        return ecosystemCustomChain.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            chain: {
                type: sequelize_1.DataTypes.STRING(50),
                allowNull: false,
                validate: {
                    notEmpty: { msg: "chain: Chain symbol must not be empty" },
                    is: {
                        args: ["^[A-Z0-9]{2,20}$", ""],
                        msg: "chain: Symbol must be 2-20 uppercase letters/digits (e.g. PBX)",
                    },
                },
            },
            name: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: false,
                validate: {
                    notEmpty: { msg: "name: Name must not be empty" },
                },
            },
            chainId: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                validate: {
                    isInt: { msg: "chainId: Chain ID must be an integer" },
                    min: { args: [1], msg: "chainId: Chain ID must be positive" },
                },
            },
            currency: {
                type: sequelize_1.DataTypes.STRING(50),
                allowNull: false,
                validate: {
                    notEmpty: { msg: "currency: Currency symbol must not be empty" },
                },
            },
            decimals: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 18,
            },
            network: {
                type: sequelize_1.DataTypes.STRING(50),
                allowNull: false,
                defaultValue: "mainnet",
            },
            rpcUrl: {
                type: sequelize_1.DataTypes.STRING(512),
                allowNull: false,
                validate: {
                    isUrl: { msg: "rpcUrl: RPC URL must be a valid URL" },
                },
            },
            rpcWssUrl: {
                type: sequelize_1.DataTypes.STRING(512),
                allowNull: true,
            },
            explorerUrl: {
                type: sequelize_1.DataTypes.STRING(512),
                allowNull: true,
            },
            explorerApiUrl: {
                type: sequelize_1.DataTypes.STRING(512),
                allowNull: true,
            },
            explorerApiKey: {
                type: sequelize_1.DataTypes.STRING(512),
                allowNull: true,
            },
            confirmations: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 12,
            },
            precision: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 8,
            },
            icon: {
                type: sequelize_1.DataTypes.STRING(1000),
                allowNull: true,
            },
            status: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: true,
            },
        }, {
            sequelize,
            modelName: "ecosystemCustomChain",
            tableName: "ecosystem_custom_chain",
            timestamps: true,
            indexes: [
                {
                    name: "PRIMARY",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "id" }],
                },
                {
                    name: "ecosystemCustomChainChainKey",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "chain" }],
                },
            ],
        });
    }
    static associate(models) { }
}
exports.default = ecosystemCustomChain;
