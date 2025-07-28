import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";
import ecommerceCategory from "./ecommerceCategory";
import ecommerceDiscount from "./ecommerceDiscount";
import ecommerceOrderItem from "./ecommerceOrderItem";
import ecommerceReview from "./ecommerceReview";
import ecommerceWishlist from "./ecommerceWishlist";

export default class ecommerceProduct
  extends Model<ecommerceProductAttributes, ecommerceProductCreationAttributes>
  implements ecommerceProductAttributes
{
  id!: string;
  name!: string;
  slug!: string;
  description!: string;
  shortDescription!: string;
  type!: "DOWNLOADABLE" | "PHYSICAL";
  price!: number;
  categoryId!: string;
  inventoryQuantity!: number;
  status!: boolean;
  image?: string;
  currency!: string;
  walletType!: "FIAT" | "SPOT" | "ECO";
  createdAt?: Date;
  deletedAt?: Date;
  updatedAt?: Date;

  // ecommerceProduct belongsTo ecommerceCategory via categoryId
  category!: ecommerceCategory;
  getCategory!: Sequelize.BelongsToGetAssociationMixin<ecommerceCategory>;
  setCategory!: Sequelize.BelongsToSetAssociationMixin<
    ecommerceCategory,
    ecommerceCategoryId
  >;
  createCategory!: Sequelize.BelongsToCreateAssociationMixin<ecommerceCategory>;
  // ecommerceProduct hasMany ecommerceDiscount via productId
  ecommerceDiscounts!: ecommerceDiscount[];
  getEcommerceDiscounts!: Sequelize.HasManyGetAssociationsMixin<ecommerceDiscount>;
  setEcommerceDiscounts!: Sequelize.HasManySetAssociationsMixin<
    ecommerceDiscount,
    ecommerceDiscountId
  >;
  addEcommerceDiscount!: Sequelize.HasManyAddAssociationMixin<
    ecommerceDiscount,
    ecommerceDiscountId
  >;
  addEcommerceDiscounts!: Sequelize.HasManyAddAssociationsMixin<
    ecommerceDiscount,
    ecommerceDiscountId
  >;
  createEcommerceDiscount!: Sequelize.HasManyCreateAssociationMixin<ecommerceDiscount>;
  removeEcommerceDiscount!: Sequelize.HasManyRemoveAssociationMixin<
    ecommerceDiscount,
    ecommerceDiscountId
  >;
  removeEcommerceDiscounts!: Sequelize.HasManyRemoveAssociationsMixin<
    ecommerceDiscount,
    ecommerceDiscountId
  >;
  hasEcommerceDiscount!: Sequelize.HasManyHasAssociationMixin<
    ecommerceDiscount,
    ecommerceDiscountId
  >;
  hasEcommerceDiscounts!: Sequelize.HasManyHasAssociationsMixin<
    ecommerceDiscount,
    ecommerceDiscountId
  >;
  countEcommerceDiscounts!: Sequelize.HasManyCountAssociationsMixin;
  // ecommerceProduct hasMany ecommerceOrderItem via productId
  ecommerceOrderItems!: ecommerceOrderItem[];
  getEcommerceOrderItems!: Sequelize.HasManyGetAssociationsMixin<ecommerceOrderItem>;
  setEcommerceOrderItems!: Sequelize.HasManySetAssociationsMixin<
    ecommerceOrderItem,
    ecommerceOrderItemId
  >;
  addEcommerceOrderItem!: Sequelize.HasManyAddAssociationMixin<
    ecommerceOrderItem,
    ecommerceOrderItemId
  >;
  addEcommerceOrderItems!: Sequelize.HasManyAddAssociationsMixin<
    ecommerceOrderItem,
    ecommerceOrderItemId
  >;
  createEcommerceOrderItem!: Sequelize.HasManyCreateAssociationMixin<ecommerceOrderItem>;
  removeEcommerceOrderItem!: Sequelize.HasManyRemoveAssociationMixin<
    ecommerceOrderItem,
    ecommerceOrderItemId
  >;
  removeEcommerceOrderItems!: Sequelize.HasManyRemoveAssociationsMixin<
    ecommerceOrderItem,
    ecommerceOrderItemId
  >;
  hasEcommerceOrderItem!: Sequelize.HasManyHasAssociationMixin<
    ecommerceOrderItem,
    ecommerceOrderItemId
  >;
  hasEcommerceOrderItems!: Sequelize.HasManyHasAssociationsMixin<
    ecommerceOrderItem,
    ecommerceOrderItemId
  >;
  countEcommerceOrderItems!: Sequelize.HasManyCountAssociationsMixin;
  // ecommerceProduct hasMany ecommerceReview via productId
  ecommerceReviews!: ecommerceReview[];
  getEcommerceReviews!: Sequelize.HasManyGetAssociationsMixin<ecommerceReview>;
  setEcommerceReviews!: Sequelize.HasManySetAssociationsMixin<
    ecommerceReview,
    ecommerceReviewId
  >;
  addEcommerceReview!: Sequelize.HasManyAddAssociationMixin<
    ecommerceReview,
    ecommerceReviewId
  >;
  addEcommerceReviews!: Sequelize.HasManyAddAssociationsMixin<
    ecommerceReview,
    ecommerceReviewId
  >;
  createEcommerceReview!: Sequelize.HasManyCreateAssociationMixin<ecommerceReview>;
  removeEcommerceReview!: Sequelize.HasManyRemoveAssociationMixin<
    ecommerceReview,
    ecommerceReviewId
  >;
  removeEcommerceReviews!: Sequelize.HasManyRemoveAssociationsMixin<
    ecommerceReview,
    ecommerceReviewId
  >;
  hasEcommerceReview!: Sequelize.HasManyHasAssociationMixin<
    ecommerceReview,
    ecommerceReviewId
  >;
  hasEcommerceReviews!: Sequelize.HasManyHasAssociationsMixin<
    ecommerceReview,
    ecommerceReviewId
  >;
  countEcommerceReviews!: Sequelize.HasManyCountAssociationsMixin;
  // ecommerceProduct hasMany ecommerceWishlist via productId
  ecommerceWishlists!: ecommerceWishlist[];
  getEcommerceWishlists!: Sequelize.HasManyGetAssociationsMixin<ecommerceWishlist>;
  setEcommerceWishlists!: Sequelize.HasManySetAssociationsMixin<
    ecommerceWishlist,
    ecommerceWishlistId
  >;
  addEcommerceWishlist!: Sequelize.HasManyAddAssociationMixin<
    ecommerceWishlist,
    ecommerceWishlistId
  >;
  addEcommerceWishlists!: Sequelize.HasManyAddAssociationsMixin<
    ecommerceWishlist,
    ecommerceWishlistId
  >;
  createEcommerceWishlist!: Sequelize.HasManyCreateAssociationMixin<ecommerceWishlist>;
  removeEcommerceWishlist!: Sequelize.HasManyRemoveAssociationMixin<
    ecommerceWishlist,
    ecommerceWishlistId
  >;
  removeEcommerceWishlists!: Sequelize.HasManyRemoveAssociationsMixin<
    ecommerceWishlist,
    ecommerceWishlistId
  >;
  hasEcommerceWishlist!: Sequelize.HasManyHasAssociationMixin<
    ecommerceWishlist,
    ecommerceWishlistId
  >;
  hasEcommerceWishlists!: Sequelize.HasManyHasAssociationsMixin<
    ecommerceWishlist,
    ecommerceWishlistId
  >;
  countEcommerceWishlists!: Sequelize.HasManyCountAssociationsMixin;

  public static initModel(
    sequelize: Sequelize.Sequelize
  ): typeof ecommerceProduct {
    return ecommerceProduct.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        name: {
          type: DataTypes.STRING(191),
          allowNull: false,
          validate: {
            notEmpty: { msg: "name: Name must not be empty" },
          },
        },
        slug: {
          type: DataTypes.STRING(191),
          allowNull: false,
        },
        description: {
          type: DataTypes.TEXT("long"),
          allowNull: false,
          validate: {
            notEmpty: { msg: "description: Description must not be empty" },
          },
        },
        shortDescription: {
          type: DataTypes.STRING(191),
          allowNull: true,
        },
        type: {
          type: DataTypes.ENUM("DOWNLOADABLE", "PHYSICAL"),
          allowNull: false,
          validate: {
            isIn: {
              args: [["DOWNLOADABLE", "PHYSICAL"]],
              msg: "type: Must be either 'DOWNLOADABLE' or 'PHYSICAL'",
            },
          },
        },
        price: {
          type: DataTypes.DOUBLE,
          allowNull: false,
          validate: {
            isFloat: { msg: "price: Price must be a valid number" },
            min: { args: [0], msg: "price: Price cannot be negative" },
          },
        },
        categoryId: {
          type: DataTypes.UUID,
          allowNull: false,
          validate: {
            isUUID: {
              args: 4,
              msg: "categoryId: Category ID must be a valid UUID",
            },
          },
        },
        inventoryQuantity: {
          type: DataTypes.INTEGER,
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
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
          validate: {
            isBoolean: { msg: "status: Status must be a boolean value" },
          },
        },
        image: {
          type: DataTypes.STRING(191),
          allowNull: true,
          validate: {
            is: {
              args: ["^/(uploads|img)/.*$", "i"],
              msg: "image: Image must be a valid URL",
            },
          },
        },
        currency: {
          type: DataTypes.STRING(191),
          allowNull: false,
          defaultValue: "USD",
          validate: {
            notEmpty: { msg: "currency: Currency must not be empty" },
          },
        },
        walletType: {
          type: DataTypes.ENUM("FIAT", "SPOT", "ECO"),
          allowNull: false,
          defaultValue: "SPOT",
          validate: {
            isIn: {
              args: [["FIAT", "SPOT", "ECO"]],
              msg: "walletType: Must be either 'FIAT', 'SPOT', or 'ECO'",
            },
          },
        },
      },
      {
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
        ],
        hooks: {
          async beforeValidate(product) {
            // Only generate a unique slug if none is provided and a name exists
            if (!product.slug && product.name) {
              product.slug = await ecommerceProduct.generateUniqueSlug(
                product.name
              );
            }
          },
        },
      }
    );
  }

  public static associate(models: any) {
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
    ecommerceProduct.belongsToMany(models.ecommerceShipping, {
      as: "shippings",
      through: models.ecommerceOrder,
      foreignKey: "productId",
      otherKey: "shippingId",
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

  public static async generateUniqueSlug(name: string): Promise<string> {
    const baseSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-") // Replace non-alphanumeric characters with dashes
      .replace(/^-+|-+$/g, ""); // Trim leading and trailing dashes

    let uniqueSlug = baseSlug;
    let counter = 1;

    while (await ecommerceProduct.findOne({ where: { slug: uniqueSlug } })) {
      uniqueSlug = `${baseSlug}-${counter}`;
      counter++;
    }

    return uniqueSlug;
  }
}
