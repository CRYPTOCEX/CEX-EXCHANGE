"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class ecommerceWishlistItem extends sequelize_1.Model {
    static initModel(sequelize) {
        return ecommerceWishlistItem.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            wishlistId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
            },
            productId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                validate: {
                    isUUID: {
                        args: 4,
                        msg: "productId: Product ID must be a valid UUID",
                    },
                },
            },
        }, {
            sequelize,
            modelName: "ecommerceWishlistItem",
            tableName: "ecommerce_wishlist_item",
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
                    name: "ecommerceWishlistItemWishlistIdProductId",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "wishlistId" }, { name: "productId" }],
                },
            ],
        });
    }
    static associate(models) {
        ecommerceWishlistItem.belongsTo(models.ecommerceWishlist, {
            as: "wishlist",
            foreignKey: "wishlistId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        ecommerceWishlistItem.belongsTo(models.ecommerceProduct, {
            as: "product",
            foreignKey: "productId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = ecommerceWishlistItem;
