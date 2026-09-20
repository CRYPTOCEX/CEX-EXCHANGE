"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class fxProvider extends sequelize_1.Model {
    static initModel(sequelize) {
        return fxProvider.init({
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
                comment: "Internal adapter identifier (twelvedata, finnhub, tradermade, polygon)",
            },
            title: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: false,
                validate: {
                    notEmpty: { msg: "title: Title must not be empty" },
                },
                comment: "Display title of the market data provider",
            },
            description: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
                comment: "Description of the market data provider",
            },
            status: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: true,
                defaultValue: false,
                validate: {
                    isBoolean: { msg: "status: Status must be a boolean value" },
                },
                comment: "Active provider flag (only one row may be true)",
            },
            version: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: true,
                defaultValue: "0.0.1",
                validate: {
                    notEmpty: { msg: "version: Version must not be empty" },
                },
                comment: "Adapter integration version",
            },
            proxyUrl: {
                type: sequelize_1.DataTypes.STRING(500),
                allowNull: true,
                comment: "Proxy URL for provider API requests (e.g., http://user:pass@host:port or socks5://host:port)",
            },
        }, {
            sequelize,
            modelName: "fxProvider",
            tableName: "fx_provider",
            timestamps: false,
            indexes: [
                {
                    name: "PRIMARY",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "id" }],
                },
                {
                    name: "fxProviderNameKey",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "name" }],
                },
            ],
        });
    }
    static associate(models) { }
}
exports.default = fxProvider;
