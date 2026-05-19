"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class exchangeCurrency extends sequelize_1.Model {
    static initModel(sequelize) {
        return exchangeCurrency.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            currency: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: false,
                unique: "exchangeCurrencyCurrencyKey",
                validate: {
                    notEmpty: { msg: "currency: Currency must not be empty" },
                },
                comment: "Currency symbol (e.g., BTC, ETH, USDT)",
            },
            name: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: false,
                validate: {
                    notEmpty: { msg: "name: Name must not be empty" },
                },
                comment: "Full name of the currency (e.g., Bitcoin, Ethereum)",
            },
            precision: {
                type: sequelize_1.DataTypes.DOUBLE,
                allowNull: false,
                validate: {
                    isNumeric: { msg: "precision: Precision must be a number" },
                },
                comment: "Number of decimal places for this currency",
            },
            price: {
                type: sequelize_1.DataTypes.DECIMAL(30, 15),
                allowNull: true,
                validate: {
                    isDecimal: { msg: "price: Price must be a decimal number" },
                },
                comment: "Current price of the currency",
            },
            fee: {
                type: sequelize_1.DataTypes.DOUBLE,
                allowNull: true,
                defaultValue: 0,
                validate: {
                    isNumeric: { msg: "fee: Fee must be a number" },
                },
                comment: "Trading fee percentage for this currency",
            },
            status: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: true,
                validate: {
                    isBoolean: { msg: "status: Status must be a boolean value" },
                },
                comment: "Currency availability status (active/inactive)",
            },
        }, {
            sequelize,
            modelName: "exchangeCurrency",
            tableName: "exchange_currency",
            timestamps: false,
            indexes: [
                {
                    name: "PRIMARY",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "id" }],
                },
                {
                    name: "exchangeCurrencyCurrencyKey",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "currency" }],
                },
            ],
        });
    }
    static associate(models) { }
}
exports.default = exchangeCurrency;
