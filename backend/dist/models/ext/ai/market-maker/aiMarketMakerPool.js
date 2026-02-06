"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class aiMarketMakerPool extends sequelize_1.Model {
    static initModel(sequelize) {
        return aiMarketMakerPool.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            marketMakerId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                unique: true,
                validate: {
                    notEmpty: { msg: "marketMakerId: Market Maker ID must not be empty" },
                    isUUID: { args: 4, msg: "marketMakerId: Must be a valid UUID" },
                },
            },
            baseCurrencyBalance: {
                type: sequelize_1.DataTypes.DECIMAL(30, 18),
                allowNull: false,
                defaultValue: 0,
                validate: {
                    isDecimal: { msg: "baseCurrencyBalance: Must be a valid decimal number" },
                    min: { args: [0], msg: "baseCurrencyBalance: Must be greater than or equal to 0" },
                },
                get() {
                    const value = this.getDataValue("baseCurrencyBalance");
                    return value ? parseFloat(value.toString()) : 0;
                },
            },
            quoteCurrencyBalance: {
                type: sequelize_1.DataTypes.DECIMAL(30, 18),
                allowNull: false,
                defaultValue: 0,
                validate: {
                    isDecimal: { msg: "quoteCurrencyBalance: Must be a valid decimal number" },
                    min: { args: [0], msg: "quoteCurrencyBalance: Must be greater than or equal to 0" },
                },
                get() {
                    const value = this.getDataValue("quoteCurrencyBalance");
                    return value ? parseFloat(value.toString()) : 0;
                },
            },
            initialBaseBalance: {
                type: sequelize_1.DataTypes.DECIMAL(30, 18),
                allowNull: false,
                defaultValue: 0,
                validate: {
                    isDecimal: { msg: "initialBaseBalance: Must be a valid decimal number" },
                    min: { args: [0], msg: "initialBaseBalance: Must be greater than or equal to 0" },
                },
                get() {
                    const value = this.getDataValue("initialBaseBalance");
                    return value ? parseFloat(value.toString()) : 0;
                },
            },
            initialQuoteBalance: {
                type: sequelize_1.DataTypes.DECIMAL(30, 18),
                allowNull: false,
                defaultValue: 0,
                validate: {
                    isDecimal: { msg: "initialQuoteBalance: Must be a valid decimal number" },
                    min: { args: [0], msg: "initialQuoteBalance: Must be greater than or equal to 0" },
                },
                get() {
                    const value = this.getDataValue("initialQuoteBalance");
                    return value ? parseFloat(value.toString()) : 0;
                },
            },
            totalValueLocked: {
                type: sequelize_1.DataTypes.DECIMAL(30, 18),
                allowNull: false,
                defaultValue: 0,
                validate: {
                    isDecimal: { msg: "totalValueLocked: Must be a valid decimal number" },
                    min: { args: [0], msg: "totalValueLocked: Must be greater than or equal to 0" },
                },
                get() {
                    const value = this.getDataValue("totalValueLocked");
                    return value ? parseFloat(value.toString()) : 0;
                },
            },
            unrealizedPnL: {
                type: sequelize_1.DataTypes.DECIMAL(30, 18),
                allowNull: false,
                defaultValue: 0,
                validate: {
                    isDecimal: { msg: "unrealizedPnL: Must be a valid decimal number" },
                },
                get() {
                    const value = this.getDataValue("unrealizedPnL");
                    return value ? parseFloat(value.toString()) : 0;
                },
            },
            realizedPnL: {
                type: sequelize_1.DataTypes.DECIMAL(30, 18),
                allowNull: false,
                defaultValue: 0,
                validate: {
                    isDecimal: { msg: "realizedPnL: Must be a valid decimal number" },
                },
                get() {
                    const value = this.getDataValue("realizedPnL");
                    return value ? parseFloat(value.toString()) : 0;
                },
            },
            lastRebalanceAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
            },
        }, {
            sequelize,
            modelName: "aiMarketMakerPool",
            tableName: "ai_market_maker_pool",
            timestamps: true,
            indexes: [
                {
                    name: "PRIMARY",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "id" }],
                },
                {
                    name: "aiMarketMakerPoolMarketMakerIdKey",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "marketMakerId" }],
                },
                {
                    name: "aiMarketMakerPoolRebalanceIdx",
                    using: "BTREE",
                    fields: [{ name: "lastRebalanceAt" }],
                },
            ],
        });
    }
    static associate(models) {
        aiMarketMakerPool.belongsTo(models.aiMarketMaker, {
            as: "marketMaker",
            foreignKey: "marketMakerId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = aiMarketMakerPool;
