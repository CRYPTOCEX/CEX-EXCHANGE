"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class ecommerceWishlist extends sequelize_1.Model {
    static initModel(sequelize) {
        return ecommerceWishlist.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            userId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                validate: {
                    isUUID: { args: 4, msg: "userId: User ID must be a valid UUID" },
                },
            },
        }, {
            sequelize,
            modelName: "ecommerceWishlist",
            tableName: "ecommerce_wishlist",
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
                    name: "ecommerceWishlistUserIdFkey",
                    using: "BTREE",
                    fields: [{ name: "userId" }],
                },
            ],
        });
    }
    static associate(models) {
        ecommerceWishlist.hasMany(models.ecommerceWishlistItem, {
            as: "wishlistItems",
            foreignKey: "wishlistId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        ecommerceWishlist.belongsToMany(models.ecommerceProduct, {
            as: "products",
            through: models.ecommerceWishlistItem,
            foreignKey: "wishlistId",
            otherKey: "productId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        ecommerceWishlist.belongsTo(models.user, {
            as: "user",
            foreignKey: "userId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = ecommerceWishlist;
