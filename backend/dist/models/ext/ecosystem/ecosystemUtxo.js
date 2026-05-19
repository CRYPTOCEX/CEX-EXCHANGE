"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class ecosystemUtxo extends sequelize_1.Model {
    static initModel(sequelize) {
        return ecosystemUtxo.init({
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
            transactionId: {
                type: sequelize_1.DataTypes.STRING(255),
                allowNull: false,
                validate: {
                    notEmpty: {
                        msg: "transactionId: Transaction ID must not be empty",
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
            amount: {
                type: sequelize_1.DataTypes.DOUBLE,
                allowNull: false,
                validate: {
                    isNumeric: { msg: "amount: Amount must be a number" },
                },
            },
            script: {
                type: sequelize_1.DataTypes.STRING(1000),
                allowNull: false,
                defaultValue: 'N/A',
            },
            status: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
                validate: {
                    isBoolean: { msg: "status: Status must be a boolean value" },
                },
            },
        }, {
            sequelize,
            modelName: "ecosystemUtxo",
            tableName: "ecosystem_utxo",
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
                    name: "ecosystemUtxoWalletIdIdx",
                    using: "BTREE",
                    fields: [{ name: "walletId" }],
                },
            ],
        });
    }
    static associate(models) {
        ecosystemUtxo.belongsTo(models.wallet, {
            as: "wallet",
            foreignKey: "walletId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = ecosystemUtxo;
