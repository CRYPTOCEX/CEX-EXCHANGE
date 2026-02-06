"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class futuresMarket extends sequelize_1.Model {
    static initModel(sequelize) {
        return futuresMarket.init({
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
            },
            pair: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: false,
                validate: {
                    notEmpty: { msg: "pair: Pair must not be empty" },
                },
            },
            isTrending: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: true,
                defaultValue: false,
            },
            isHot: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: true,
                defaultValue: false,
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
            },
            status: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: true,
                validate: {
                    isBoolean: { msg: "status: Status must be a boolean value" },
                },
            },
        }, {
            sequelize,
            modelName: "futuresMarket",
            tableName: "futures_market",
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
                    name: "futuresMarketCurrencyPairKey",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "currency" }, { name: "pair" }],
                },
            ],
        });
    }
    static associate(models) { }
}
exports.default = futuresMarket;
