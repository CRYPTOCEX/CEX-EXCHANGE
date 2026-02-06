"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class binaryMarket extends sequelize_1.Model {
    static initModel(sequelize) {
        return binaryMarket.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            currency: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: false,
                validate: {
                    notEmpty: { msg: "currency: Currency must not be empty" },
                },
                comment: "Base currency symbol (e.g., BTC, ETH)",
            },
            pair: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: false,
                validate: {
                    notEmpty: { msg: "pair: Pair must not be empty" },
                },
                comment: "Trading pair symbol (e.g., USDT, USD)",
            },
            minAmount: {
                type: sequelize_1.DataTypes.DECIMAL(16, 8),
                allowNull: true,
                defaultValue: 1,
                validate: {
                    min: { args: [0], msg: "minAmount: Minimum amount must be non-negative" },
                },
                comment: "Minimum order amount for this market",
            },
            maxAmount: {
                type: sequelize_1.DataTypes.DECIMAL(16, 8),
                allowNull: true,
                defaultValue: 10000,
                validate: {
                    min: { args: [0], msg: "maxAmount: Maximum amount must be non-negative" },
                },
                comment: "Maximum order amount for this market",
            },
            isTrending: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: true,
                defaultValue: false,
                comment: "Whether this market is currently trending",
            },
            isHot: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: true,
                defaultValue: false,
                comment: "Whether this market is marked as hot/popular",
            },
            status: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: true,
                validate: {
                    isBoolean: { msg: "status: Status must be a boolean value" },
                },
                comment: "Market availability status (active/inactive)",
            },
        }, {
            sequelize,
            modelName: "binaryMarket",
            tableName: "binary_market",
            timestamps: false,
            indexes: [
                {
                    name: "PRIMARY",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "id" }],
                },
                {
                    name: "binaryMarketCurrencyPairKey",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "currency" }, { name: "pair" }],
                },
            ],
        });
    }
    static associate(models) {
    }
}
exports.default = binaryMarket;
