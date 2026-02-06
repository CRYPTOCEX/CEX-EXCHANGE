"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class ecommerceCategory extends sequelize_1.Model {
    static initModel(sequelize) {
        return ecommerceCategory.init({
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
            },
            slug: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: false,
                validate: {
                    notEmpty: { msg: "slug: Slug must not be empty" },
                },
            },
            description: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: false,
                validate: {
                    notEmpty: { msg: "description: Description must not be empty" },
                },
            },
            image: {
                type: sequelize_1.DataTypes.STRING(191),
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
            modelName: "ecommerceCategory",
            tableName: "ecommerce_category",
            timestamps: true,
            paranoid: true,
            indexes: [
                {
                    name: "PRIMARY",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "id" }],
                },
            ],
            hooks: {
                async beforeValidate(category) {
                    if (!category.slug && category.name) {
                        category.slug = await ecommerceCategory.generateUniqueSlug(category.name);
                    }
                },
            },
        });
    }
    static associate(models) {
        ecommerceCategory.hasMany(models.ecommerceProduct, {
            as: "ecommerceProducts",
            foreignKey: "categoryId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
    }
    static async generateUniqueSlug(name) {
        const baseSlug = name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "");
        let uniqueSlug = baseSlug;
        let counter = 1;
        while (await ecommerceCategory.findOne({ where: { slug: uniqueSlug } })) {
            uniqueSlug = `${baseSlug}-${counter}`;
            counter++;
        }
        return uniqueSlug;
    }
}
exports.default = ecommerceCategory;
