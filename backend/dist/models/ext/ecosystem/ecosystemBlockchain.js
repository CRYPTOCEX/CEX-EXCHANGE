"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class ecosystemBlockchain extends sequelize_1.Model {
    static initModel(sequelize) {
        return ecosystemBlockchain.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            productId: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: false,
                unique: "ecosystemBlockchainProductIdKey",
                validate: {
                    notEmpty: { msg: "productId: Product ID must not be empty" },
                },
            },
            name: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: false,
                unique: "ecosystemBlockchainNameKey",
                validate: {
                    notEmpty: { msg: "name: Name must not be empty" },
                },
            },
            chain: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: true,
            },
            description: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
            },
            link: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: true,
                validate: {
                    isUrl: { msg: "link: Link must be a valid URL" },
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
            version: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: true,
                defaultValue: "0.0.1",
            },
            image: {
                type: sequelize_1.DataTypes.STRING(1000),
                allowNull: true,
                validate: {
                    is: {
                        args: ["^/(uploads|img)/.*$", "i"],
                        msg: "image: Image must be a valid URL",
                    },
                },
            },
        }, {
            sequelize,
            modelName: "ecosystemBlockchain",
            tableName: "ecosystem_blockchain",
            timestamps: false,
            indexes: [
                {
                    name: "PRIMARY",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "id" }],
                },
                {
                    name: "ecosystemBlockchainProductIdKey",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "productId" }],
                },
                {
                    name: "ecosystemBlockchainNameKey",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "name" }],
                },
            ],
        });
    }
    static associate(models) { }
}
exports.default = ecosystemBlockchain;
