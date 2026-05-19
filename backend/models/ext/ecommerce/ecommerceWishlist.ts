import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

export default class ecommerceWishlist
  extends Model<
    ecommerceWishlistAttributes,
    ecommerceWishlistCreationAttributes
  >
  implements ecommerceWishlistAttributes
{
  id!: string;
  userId!: string;
  createdAt?: Date;
  updatedAt?: Date;

  public static initModel(
    sequelize: Sequelize.Sequelize
  ): typeof ecommerceWishlist {
    return ecommerceWishlist.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        userId: {
          type: DataTypes.UUID,
          allowNull: false,
          validate: {
            isUUID: { args: 4, msg: "userId: User ID must be a valid UUID" },
          },
        },
      },
      {
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
      }
    );
  }
  public static associate(models: any) {
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
