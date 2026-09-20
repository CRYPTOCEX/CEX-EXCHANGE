import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";
import ecommerceCategory from "./ecommerceCategory";
import ecommerceDiscount from "./ecommerceDiscount";
import ecommerceOrderItem from "./ecommerceOrderItem";
import ecommerceReview from "./ecommerceReview";
import ecommerceWishlist from "./ecommerceWishlist";
import { ANY_UUID_VERSION } from "@b/utils/model-validators";

/**
 * How many extra images one product may carry.
 *
 * The cap is on the SETTER rather than on the request schema so it holds for
 * every writer — the admin form, a seeder, a future import — and so a rejected
 * 51st image can never be the reason a save fails: the surplus is dropped, the
 * record still writes.
 */
export const MAX_GALLERY_IMAGES = 12;

/**
 * The same shape `image` is validated against. Gallery entries are paths this
 * server wrote (`/uploads/...`) or ship with the build (`/img/...`); anything
 * else is either a remote URL we would be hotlinking or an attempt to point the
 * storefront somewhere it should not go.
 */
function isImagePath(value: unknown): value is string {
  return typeof value === "string" && /^\/(uploads|img)\//i.test(value.trim());
}

function safeParseArray(value: string): unknown[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

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
  gallery?: string[];
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
    string
  >;
  createCategory!: Sequelize.BelongsToCreateAssociationMixin<ecommerceCategory>;
  // ecommerceProduct hasMany ecommerceDiscount via productId
  ecommerceDiscounts!: ecommerceDiscount[];
  getEcommerceDiscounts!: Sequelize.HasManyGetAssociationsMixin<ecommerceDiscount>;
  setEcommerceDiscounts!: Sequelize.HasManySetAssociationsMixin<
    ecommerceDiscount,
    string
  >;
  addEcommerceDiscount!: Sequelize.HasManyAddAssociationMixin<
    ecommerceDiscount,
    string
  >;
  addEcommerceDiscounts!: Sequelize.HasManyAddAssociationsMixin<
    ecommerceDiscount,
    string
  >;
  createEcommerceDiscount!: Sequelize.HasManyCreateAssociationMixin<ecommerceDiscount>;
  removeEcommerceDiscount!: Sequelize.HasManyRemoveAssociationMixin<
    ecommerceDiscount,
    string
  >;
  removeEcommerceDiscounts!: Sequelize.HasManyRemoveAssociationsMixin<
    ecommerceDiscount,
    string
  >;
  hasEcommerceDiscount!: Sequelize.HasManyHasAssociationMixin<
    ecommerceDiscount,
    string
  >;
  hasEcommerceDiscounts!: Sequelize.HasManyHasAssociationsMixin<
    ecommerceDiscount,
    string
  >;
  countEcommerceDiscounts!: Sequelize.HasManyCountAssociationsMixin;
  // ecommerceProduct hasMany ecommerceOrderItem via productId
  ecommerceOrderItems!: ecommerceOrderItem[];
  getEcommerceOrderItems!: Sequelize.HasManyGetAssociationsMixin<ecommerceOrderItem>;
  setEcommerceOrderItems!: Sequelize.HasManySetAssociationsMixin<
    ecommerceOrderItem,
    string
  >;
  addEcommerceOrderItem!: Sequelize.HasManyAddAssociationMixin<
    ecommerceOrderItem,
    string
  >;
  addEcommerceOrderItems!: Sequelize.HasManyAddAssociationsMixin<
    ecommerceOrderItem,
    string
  >;
  createEcommerceOrderItem!: Sequelize.HasManyCreateAssociationMixin<ecommerceOrderItem>;
  removeEcommerceOrderItem!: Sequelize.HasManyRemoveAssociationMixin<
    ecommerceOrderItem,
    string
  >;
  removeEcommerceOrderItems!: Sequelize.HasManyRemoveAssociationsMixin<
    ecommerceOrderItem,
    string
  >;
  hasEcommerceOrderItem!: Sequelize.HasManyHasAssociationMixin<
    ecommerceOrderItem,
    string
  >;
  hasEcommerceOrderItems!: Sequelize.HasManyHasAssociationsMixin<
    ecommerceOrderItem,
    string
  >;
  countEcommerceOrderItems!: Sequelize.HasManyCountAssociationsMixin;
  // ecommerceProduct hasMany ecommerceReview via productId
  ecommerceReviews!: ecommerceReview[];
  getEcommerceReviews!: Sequelize.HasManyGetAssociationsMixin<ecommerceReview>;
  setEcommerceReviews!: Sequelize.HasManySetAssociationsMixin<
    ecommerceReview,
    string
  >;
  addEcommerceReview!: Sequelize.HasManyAddAssociationMixin<
    ecommerceReview,
    string
  >;
  addEcommerceReviews!: Sequelize.HasManyAddAssociationsMixin<
    ecommerceReview,
    string
  >;
  createEcommerceReview!: Sequelize.HasManyCreateAssociationMixin<ecommerceReview>;
  removeEcommerceReview!: Sequelize.HasManyRemoveAssociationMixin<
    ecommerceReview,
    string
  >;
  removeEcommerceReviews!: Sequelize.HasManyRemoveAssociationsMixin<
    ecommerceReview,
    string
  >;
  hasEcommerceReview!: Sequelize.HasManyHasAssociationMixin<
    ecommerceReview,
    string
  >;
  hasEcommerceReviews!: Sequelize.HasManyHasAssociationsMixin<
    ecommerceReview,
    string
  >;
  countEcommerceReviews!: Sequelize.HasManyCountAssociationsMixin;
  // ecommerceProduct hasMany ecommerceWishlist via productId
  ecommerceWishlists!: ecommerceWishlist[];
  getEcommerceWishlists!: Sequelize.HasManyGetAssociationsMixin<ecommerceWishlist>;
  setEcommerceWishlists!: Sequelize.HasManySetAssociationsMixin<
    ecommerceWishlist,
    string
  >;
  addEcommerceWishlist!: Sequelize.HasManyAddAssociationMixin<
    ecommerceWishlist,
    string
  >;
  addEcommerceWishlists!: Sequelize.HasManyAddAssociationsMixin<
    ecommerceWishlist,
    string
  >;
  createEcommerceWishlist!: Sequelize.HasManyCreateAssociationMixin<ecommerceWishlist>;
  removeEcommerceWishlist!: Sequelize.HasManyRemoveAssociationMixin<
    ecommerceWishlist,
    string
  >;
  removeEcommerceWishlists!: Sequelize.HasManyRemoveAssociationsMixin<
    ecommerceWishlist,
    string
  >;
  hasEcommerceWishlist!: Sequelize.HasManyHasAssociationMixin<
    ecommerceWishlist,
    string
  >;
  hasEcommerceWishlists!: Sequelize.HasManyHasAssociationsMixin<
    ecommerceWishlist,
    string
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
            isUUID: { args: ANY_UUID_VERSION,
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
        /**
         * Additional storefront images, in the order the merchant arranged
         * them. `image` stays the single cover the catalogue, cart, order rows
         * and every card render read — nothing downstream had to learn about a
         * list, and a product with no gallery is exactly what it was before.
         *
         * The getter is the guarded house pattern rather than a bare
         * `JSON.parse`: prod MySQL hands a `DataTypes.JSON` column back already
         * parsed while local MariaDB stores it as LONGTEXT and returns the
         * string, and an in-memory instance right after `create()` holds the
         * assigned array. All three have to leave here as an array or the
         * storefront's `.map` dies on whichever environment disagrees.
         */
        gallery: {
          type: DataTypes.JSON,
          allowNull: true,
          defaultValue: null,
          get(): string[] {
            const raw = this.getDataValue("gallery") as unknown;
            if (raw == null) return [];
            if (typeof raw === "string") {
              try {
                const parsed = JSON.parse(raw);
                return Array.isArray(parsed) ? parsed.filter(isImagePath) : [];
              } catch {
                return [];
              }
            }
            return Array.isArray(raw) ? raw.filter(isImagePath) : [];
          },
          set(value: unknown) {
            // `null` is the clear signal and has to survive as null so the
            // column empties; anything else is normalised to a deduped list of
            // upload paths, capped, so one bad request cannot grow the row
            // without bound.
            if (value === null || value === undefined) {
              this.setDataValue("gallery", null as any);
              return;
            }
            const list = Array.isArray(value)
              ? value
              : typeof value === "string"
                ? safeParseArray(value)
                : [];
            const clean = Array.from(
              new Set(list.filter(isImagePath).map((entry) => entry.trim()))
            ).slice(0, MAX_GALLERY_IMAGES);
            this.setDataValue(
              "gallery",
              (clean.length ? clean : null) as any
            );
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
          {
            name: "ecommerceProductSlugUnique",
            unique: true,
            using: "BTREE",
            fields: [{ name: "slug" }],
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
    // BUG-11 fixed: removed incorrect belongsToMany through ecommerceOrder
    // ecommerceOrder doesn't have a productId column
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
