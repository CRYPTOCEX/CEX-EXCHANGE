"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAX_GALLERY_IMAGES = void 0;
const sequelize_1 = require("sequelize");
const model_validators_1 = require("@b/utils/model-validators");
exports.MAX_GALLERY_IMAGES = 12;
function isImagePath(value) {
    return typeof value === "string" && /^\/(uploads|img)\//i.test(value.trim());
}
function safeParseArray(value) {
    try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
    }
    catch (_a) {
        return [];
    }
}
class ecommerceProduct extends sequelize_1.Model {
    static initModel(sequelize) {
        return ecommerceProduct.init({
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
            },
            description: {
                type: sequelize_1.DataTypes.TEXT("long"),
                allowNull: false,
                validate: {
                    notEmpty: { msg: "description: Description must not be empty" },
                },
            },
            shortDescription: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: true,
            },
            type: {
                type: sequelize_1.DataTypes.ENUM("DOWNLOADABLE", "PHYSICAL"),
                allowNull: false,
                validate: {
                    isIn: {
                        args: [["DOWNLOADABLE", "PHYSICAL"]],
                        msg: "type: Must be either 'DOWNLOADABLE' or 'PHYSICAL'",
                    },
                },
            },
            price: {
                type: sequelize_1.DataTypes.DOUBLE,
                allowNull: false,
                validate: {
                    isFloat: { msg: "price: Price must be a valid number" },
                    min: { args: [0], msg: "price: Price cannot be negative" },
                },
            },
            categoryId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                validate: {
                    isUUID: { args: model_validators_1.ANY_UUID_VERSION,
                        msg: "categoryId: Category ID must be a valid UUID", },
                },
            },
            inventoryQuantity: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                validate: {
                    isInt: {
                        msg: "inventoryQuantity: Inventory quantity must be an integer",
                    },
                    min: {
                        args: [0],
                        msg: "inventoryQuantity: Inventory quantity cannot be negative",
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
            gallery: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: true,
                defaultValue: null,
                get() {
                    const raw = this.getDataValue("gallery");
                    if (raw == null)
                        return [];
                    if (typeof raw === "string") {
                        try {
                            const parsed = JSON.parse(raw);
                            return Array.isArray(parsed) ? parsed.filter(isImagePath) : [];
                        }
                        catch (_a) {
                            return [];
                        }
                    }
                    return Array.isArray(raw) ? raw.filter(isImagePath) : [];
                },
                set(value) {
                    if (value === null || value === undefined) {
                        this.setDataValue("gallery", null);
                        return;
                    }
                    const list = Array.isArray(value)
                        ? value
                        : typeof value === "string"
                            ? safeParseArray(value)
                            : [];
                    const clean = Array.from(new Set(list.filter(isImagePath).map((entry) => entry.trim()))).slice(0, exports.MAX_GALLERY_IMAGES);
                    this.setDataValue("gallery", (clean.length ? clean : null));
                },
            },
            currency: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: false,
                defaultValue: "USD",
                validate: {
                    notEmpty: { msg: "currency: Currency must not be empty" },
                },
            },
            walletType: {
                type: sequelize_1.DataTypes.ENUM("FIAT", "SPOT", "ECO"),
                allowNull: false,
                defaultValue: "SPOT",
                validate: {
                    isIn: {
                        args: [["FIAT", "SPOT", "ECO"]],
                        msg: "walletType: Must be either 'FIAT', 'SPOT', or 'ECO'",
                    },
                },
            },
        }, {
            sequelize,
            modelName: "ecommerceProduct",
            tableName: "ecommerce_product",
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
                    name: "ecommerceProductCategoryIdFkey",
                    using: "BTREE",
                    fields: [{ name: "categoryId" }],
                },
                {
                    name: "ecommerceProductSlugUnique",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "slug" }],
                },
            ],
            hooks: {
                async beforeValidate(product) {
                    if (!product.slug && product.name) {
                        product.slug = await ecommerceProduct.generateUniqueSlug(product.name);
                    }
                },
            },
        });
    }
    static associate(models) {
        ecommerceProduct.belongsTo(models.ecommerceCategory, {
            as: "category",
            foreignKey: "categoryId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        ecommerceProduct.hasMany(models.ecommerceDiscount, {
            as: "ecommerceDiscounts",
            foreignKey: "productId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        ecommerceProduct.hasMany(models.ecommerceReview, {
            as: "ecommerceReviews",
            foreignKey: "productId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        ecommerceProduct.hasMany(models.ecommerceOrderItem, {
            as: "ecommerceOrderItems",
            foreignKey: "productId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        ecommerceProduct.belongsToMany(models.ecommerceOrder, {
            as: "orders",
            through: models.ecommerceOrderItem,
            foreignKey: "productId",
            otherKey: "orderId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        ecommerceProduct.hasMany(models.ecommerceWishlistItem, {
            as: "wishlistItems",
            foreignKey: "productId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        ecommerceProduct.belongsToMany(models.ecommerceWishlist, {
            as: "wishlists",
            through: models.ecommerceWishlistItem,
            foreignKey: "productId",
            otherKey: "wishlistId",
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
        while (await ecommerceProduct.findOne({ where: { slug: uniqueSlug } })) {
            uniqueSlug = `${baseSlug}-${counter}`;
            counter++;
        }
        return uniqueSlug;
    }
}
exports.default = ecommerceProduct;
