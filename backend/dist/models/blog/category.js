"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class category extends sequelize_1.Model {
    static initModel(sequelize) {
        return category.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
                comment: "Unique identifier for the blog category",
            },
            name: {
                type: sequelize_1.DataTypes.STRING(255),
                allowNull: false,
                validate: {
                    notEmpty: { msg: "name: Name must not be empty" },
                },
                comment: "Display name of the blog category",
            },
            slug: {
                type: sequelize_1.DataTypes.STRING(255),
                allowNull: false,
                unique: "categorySlugKey",
                validate: {
                    notEmpty: { msg: "slug: Slug must not be empty" },
                    is: {
                        args: [/^[a-z0-9]+(?:-[a-z0-9]+)*$/],
                        msg: "slug: Slug must be URL-friendly (lowercase letters, numbers, and hyphens only)",
                    },
                },
                comment: "URL-friendly slug for the category (used in URLs)",
            },
            image: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
                validate: {
                    is: {
                        args: ["^/(uploads|img)/.*$", "i"],
                        msg: "image: Image must be a valid URL",
                    },
                },
                comment: "URL path to the category's featured image",
            },
            description: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
                comment: "Description of the blog category",
            },
        }, {
            sequelize,
            modelName: "category",
            tableName: "category",
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
                    name: "categorySlugKey",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "slug" }],
                },
            ],
        });
    }
    static associate(models) {
        category.hasMany(models.post, {
            as: "posts",
            foreignKey: "categoryId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = category;
