"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class exchange extends sequelize_1.Model {
    static initModel(sequelize) {
        return exchange.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            name: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: false,
                validate: {
                    notEmpty: { msg: "name: Name must not be empty" },
                },
                comment: "Internal name identifier for the exchange",
            },
            title: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: false,
                validate: {
                    notEmpty: { msg: "title: Title must not be empty" },
                },
                comment: "Display title of the exchange",
            },
            description: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
                comment: "Description of the exchange provider",
            },
            status: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: true,
                defaultValue: false,
                validate: {
                    isBoolean: { msg: "status: Status must be a boolean value" },
                },
                comment: "Exchange connection status (active/inactive)",
            },
            username: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: true,
                validate: {
                    notEmpty: { msg: "username: Username must not be empty" },
                },
                comment: "Exchange API username/identifier",
            },
            licenseStatus: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: true,
                defaultValue: false,
                validate: {
                    isBoolean: {
                        msg: "licenseStatus: License Status must be a boolean value",
                    },
                },
                comment: "Exchange license validation status",
            },
            version: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: true,
                defaultValue: "0.0.1",
                validate: {
                    notEmpty: { msg: "version: Version must not be empty" },
                },
                comment: "Exchange integration version",
            },
            productId: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: true,
                unique: "exchangeProductIdKey",
                validate: {
                    notEmpty: { msg: "productId: Product ID must not be empty" },
                },
                comment: "Unique product identifier for the exchange",
            },
            type: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: true,
                defaultValue: "spot",
                validate: {
                    notEmpty: { msg: "type: Type must not be empty" },
                },
                comment: "Type of exchange (spot, futures, etc.)",
            },
            link: {
                type: sequelize_1.DataTypes.STRING(500),
                allowNull: true,
                comment: "Envato product URL for this exchange provider",
            },
            proxyUrl: {
                type: sequelize_1.DataTypes.STRING(500),
                allowNull: true,
                comment: "Proxy URL for exchange API requests (e.g., http://user:pass@host:port or socks5://host:port)",
            },
        }, {
            sequelize,
            modelName: "exchange",
            tableName: "exchange",
            timestamps: false,
            indexes: [
                {
                    name: "PRIMARY",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "id" }],
                },
                {
                    name: "exchangeProductIdKey",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "productId" }],
                },
            ],
        });
    }
    static associate(models) { }
}
exports.default = exchange;
