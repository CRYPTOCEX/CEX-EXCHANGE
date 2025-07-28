import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";
import ecommerceProduct from "./ecommerceProduct";
import ecommerceUserDiscount from "./ecommerceUserDiscount";

export default class ecommerceDiscount
  extends Model<
    ecommerceDiscountAttributes,
    ecommerceDiscountCreationAttributes
  >
  implements ecommerceDiscountAttributes
{
  id!: string;
  code!: string;
  percentage!: number;
  validUntil!: Date;
  productId!: string;
  status!: boolean;
  createdAt?: Date;
  deletedAt?: Date;
  updatedAt?: Date;

  // ecommerceDiscount hasMany ecommerceUserDiscount via discountId
  ecommerceUserDiscounts!: ecommerceUserDiscount[];
  getEcommerceUserDiscounts!: Sequelize.HasManyGetAssociationsMixin<ecommerceUserDiscount>;
  setEcommerceUserDiscounts!: Sequelize.HasManySetAssociationsMixin<
    ecommerceUserDiscount,
    ecommerceUserDiscountId
  >;
  addEcommerceUserDiscount!: Sequelize.HasManyAddAssociationMixin<
    ecommerceUserDiscount,
    ecommerceUserDiscountId
  >;
  addEcommerceUserDiscounts!: Sequelize.HasManyAddAssociationsMixin<
    ecommerceUserDiscount,
    ecommerceUserDiscountId
  >;
  createEcommerceUserDiscount!: Sequelize.HasManyCreateAssociationMixin<ecommerceUserDiscount>;
  removeEcommerceUserDiscount!: Sequelize.HasManyRemoveAssociationMixin<
    ecommerceUserDiscount,
    ecommerceUserDiscountId
  >;
  removeEcommerceUserDiscounts!: Sequelize.HasManyRemoveAssociationsMixin<
    ecommerceUserDiscount,
    ecommerceUserDiscountId
  >;
  hasEcommerceUserDiscount!: Sequelize.HasManyHasAssociationMixin<
    ecommerceUserDiscount,
    ecommerceUserDiscountId
  >;
  hasEcommerceUserDiscounts!: Sequelize.HasManyHasAssociationsMixin<
    ecommerceUserDiscount,
    ecommerceUserDiscountId
  >;
  countEcommerceUserDiscounts!: Sequelize.HasManyCountAssociationsMixin;
  // ecommerceDiscount belongsTo ecommerceProduct via productId
  product!: ecommerceProduct;
  getProduct!: Sequelize.BelongsToGetAssociationMixin<ecommerceProduct>;
  setProduct!: Sequelize.BelongsToSetAssociationMixin<
    ecommerceProduct,
    ecommerceProductId
  >;
  createProduct!: Sequelize.BelongsToCreateAssociationMixin<ecommerceProduct>;

  public static initModel(sequelize: Sequelize.Sequelize): typeof ecommerceDiscount {
    return ecommerceDiscount.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        code: {
          type: DataTypes.STRING(191),
          allowNull: false,
          unique: "ecommerceDiscountCodeKey",
          validate: {
            notEmpty: { msg: "code: Code must not be empty" },
          },
        },
        percentage: {
          type: DataTypes.INTEGER,
          allowNull: false,
          validate: {
            isInt: { msg: "percentage: Percentage must be an integer" },
            min: {
              args: [0],
              msg: "percentage: Percentage cannot be negative",
            },
            max: {
              args: [100],
              msg: "percentage: Percentage cannot be more than 100",
            },
          },
        },
        validUntil: {
          type: DataTypes.DATE(3),
          allowNull: false,
          validate: {
            isDate: {
              msg: "validUntil: Must be a valid date",
              args: true, // args must be provided even if not used
            },
            isAfter: {
              args: new Date().toISOString(),
              msg: "validUntil: Date must be in the future",
            },
          },
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
        status: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
          validate: {
            isBoolean: { msg: "status: Status must be a boolean value" },
          },
        },
      },
      {
        sequelize,
        modelName: "ecommerceDiscount",
        tableName: "ecommerce_discount",
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
            name: "ecommerceDiscountCodeKey",
            unique: true,
            using: "BTREE",
            fields: [{ name: "code" }],
          },
          {
            name: "ecommerceDiscountProductIdFkey",
            using: "BTREE",
            fields: [{ name: "productId" }],
          },
        ],
      }
    );
  }
  public static associate(models: any) {
    ecommerceDiscount.belongsTo(models.ecommerceProduct, {
      as: "product",
      foreignKey: "productId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    ecommerceDiscount.hasMany(models.ecommerceUserDiscount, {
      as: "ecommerceUserDiscounts",
      foreignKey: "discountId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  }
}
