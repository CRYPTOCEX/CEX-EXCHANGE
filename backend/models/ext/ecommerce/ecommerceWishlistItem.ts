import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";
import ecommerceProduct from "./ecommerceProduct";
import ecommerceWishlist from "./ecommerceWishlist";

export default class ecommerceWishlistItem
  extends Model<
    ecommerceWishlistItemAttributes,
    ecommerceWishlistItemCreationAttributes
  >
  implements ecommerceWishlistItemAttributes
{
  id!: string;
  wishlistId!: string;
  productId!: string;
  createdAt?: Date;
  updatedAt?: Date;

  // ecommerceWishlistItem belongsTo ecommerceWishlist via wishlistId
  wishlist!: ecommerceWishlist;
  getecommerceWishlist!: Sequelize.BelongsToGetAssociationMixin<ecommerceWishlist>;
  setecommerceWishlist!: Sequelize.BelongsToSetAssociationMixin<
    ecommerceWishlist,
    ecommerceWishlistId
  >;
  createecommerceWishlist!: Sequelize.BelongsToCreateAssociationMixin<ecommerceWishlist>;
  // ecommerceWishlistItem belongsTo ecommerceProduct via productId
  product!: ecommerceProduct;
  getecommerceProduct!: Sequelize.BelongsToGetAssociationMixin<ecommerceProduct>;
  setecommerceProduct!: Sequelize.BelongsToSetAssociationMixin<
    ecommerceProduct,
    ecommerceProductId
  >;
  createecommerceProduct!: Sequelize.BelongsToCreateAssociationMixin<ecommerceProduct>;

  public static initModel(
    sequelize: Sequelize.Sequelize
  ): typeof ecommerceWishlistItem {
    return ecommerceWishlistItem.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        wishlistId: {
          type: DataTypes.UUID,
          allowNull: false,
        },
        productId: {
          type: DataTypes.UUID,
          allowNull: false,
          validate: {
            isUUID: {
              args: 4,
              msg: "productId: Product ID must be a valid UUID",
            },
          },
        },
      },
      {
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
      }
    );
  }
  public static associate(models: any) {
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
