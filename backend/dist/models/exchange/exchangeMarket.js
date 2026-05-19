"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class exchangeMarket extends sequelize_1.Model {
    static initModel(sequelize) {
        return exchangeMarket.init({
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
                comment: "Quote currency symbol (e.g., USDT, USD)",
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
            metadata: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
                validate: {
                    isJSON(value) {
                        try {
                            const json = JSON.parse(value);
                            if (typeof json !== "object" || json === null) {
                                throw new Error("Metadata must be a valid JSON object.");
                            }
                            if (typeof json.precision !== "object")
                                throw new Error("Invalid precision.");
                        }
                        catch (err) {
                            throw new Error("Metadata must be a valid JSON object: " + err.message);
                        }
                    },
                },
                set(value) {
                    this.setDataValue("metadata", JSON.stringify(value));
                },
                get() {
                    const value = this.getDataValue("metadata");
                    return value ? JSON.parse(value) : null;
                },
                comment: "Additional market configuration and precision settings",
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
            modelName: "exchangeMarket",
            tableName: "exchange_market",
            timestamps: false,
            indexes: [
                {
                    name: "PRIMARY",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "id" }],
                },
                {
                    name: "exchangeMarketCurrencyPairKey",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "currency" }, { name: "pair" }],
                },
            ],
        });
    }
    static associate(models) { }
}
exports.default = exchangeMarket;
