"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class nftCategory extends sequelize_1.Model {
    static initModel(sequelize) {
        return nftCategory.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            name: {
                type: sequelize_1.DataTypes.STRING(255),
                allowNull: false,
                unique: "nftCategoryNameKey",
                validate: {
                    notEmpty: { msg: "name: Category name must not be empty" },
                    len: { args: [1, 255], msg: "name: Category name must be between 1 and 255 characters" },
                },
            },
            slug: {
                type: sequelize_1.DataTypes.STRING(255),
                allowNull: false,
                unique: "nftCategorySlugKey",
                validate: {
                    notEmpty: { msg: "slug: Slug must not be empty" },
                    is: { args: /^[a-z0-9-]+$/, msg: "slug: Slug must contain only lowercase letters, numbers, and hyphens" },
                },
            },
            description: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
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
            modelName: "nftCategory",
            tableName: "nft_category",
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
                    name: "nftCategoryNameKey",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "name" }],
                },
                {
                    name: "nftCategorySlugKey",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "slug" }],
                },
                {
                    name: "nftCategoryStatusIdx",
                    using: "BTREE",
                    fields: [{ name: "status" }],
                },
            ],
        });
    }
    static associate(models) {
        nftCategory.hasMany(models.nftCollection, {
            as: "collections",
            foreignKey: "categoryId",
            onDelete: "SET NULL",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = nftCategory;
