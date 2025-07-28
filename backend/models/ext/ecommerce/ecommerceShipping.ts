import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";
import ecommerceOrderItem from "./ecommerceOrderItem";

export default class ecommerceShipping
  extends Model<
    ecommerceShippingAttributes,
    ecommerceShippingCreationAttributes
  >
  implements ecommerceShippingAttributes
{
  id!: string;
  loadId!: string;
  loadStatus!: "PENDING" | "TRANSIT" | "DELIVERED" | "CANCELLED";
  shipper!: string;
  transporter!: string;
  goodsType!: string;
  weight!: number;
  volume!: number;
  description!: string;
  vehicle!: string;
  cost?: number;
  tax?: number;
  deliveryDate?: Date;
  createdAt?: Date;
  updatedAt?: Date;

  // ecommerceShipping hasMany ecommerceOrderItem via shippingId
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

  public static initModel(sequelize: Sequelize.Sequelize): typeof ecommerceShipping {
    return ecommerceShipping.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        loadId: {
          type: DataTypes.STRING,
          allowNull: false,
          validate: {
            notEmpty: { msg: "loadId: Load ID must not be empty" },
          },
        },
        loadStatus: {
          type: DataTypes.ENUM("PENDING", "TRANSIT", "DELIVERED", "CANCELLED"),
          allowNull: false,
          validate: {
            isIn: {
              args: [["PENDING", "TRANSIT", "DELIVERED", "CANCELLED"]],
              msg: "loadStatus: Must be one of PENDING, TRANSIT, DELIVERED, CANCELLED",
            },
          },
        },
        shipper: {
          type: DataTypes.STRING,
          allowNull: false,
          validate: {
            notEmpty: { msg: "shipper: Shipper must not be empty" },
          },
        },
        transporter: {
          type: DataTypes.STRING,
          allowNull: false,
          validate: {
            notEmpty: { msg: "transporter: Transporter must not be empty" },
          },
        },
        goodsType: {
          type: DataTypes.STRING,
          allowNull: false,
          validate: {
            notEmpty: { msg: "goodsType: Goods type must not be empty" },
          },
        },
        weight: {
          type: DataTypes.FLOAT,
          allowNull: false,
          validate: {
            isNumeric: { msg: "weight: Must be a numeric value" },
          },
        },
        volume: {
          type: DataTypes.FLOAT,
          allowNull: false,
          validate: {
            isNumeric: { msg: "volume: Must be a numeric value" },
          },
        },
        description: {
          type: DataTypes.STRING,
          allowNull: false,
          validate: {
            notEmpty: { msg: "description: Description must not be empty" },
          },
        },
        vehicle: {
          type: DataTypes.STRING,
          allowNull: false,
          validate: {
            notEmpty: { msg: "vehicle: Vehicle must not be empty" },
          },
        },
        cost: {
          type: DataTypes.FLOAT,
          allowNull: true,
          validate: {
            isNumeric: { msg: "cost: Must be a numeric value" },
          },
        },
        tax: {
          type: DataTypes.FLOAT,
          allowNull: true,
          validate: {
            isNumeric: { msg: "tax: Must be a numeric value" },
          },
        },
        deliveryDate: {
          type: DataTypes.DATE,
          allowNull: true,
        },
      },
      {
        sequelize,
        modelName: "ecommerceShipping",
        tableName: "ecommerce_shipping",
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
      }
    );
  }
  public static associate(models: any) {
    ecommerceShipping.hasMany(models.ecommerceOrder, {
      as: "ecommerceOrders",
      foreignKey: "shippingId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    ecommerceShipping.belongsToMany(models.ecommerceProduct, {
      as: "products",
      through: models.ecommerceOrder,
      foreignKey: "shippingId",
      otherKey: "productId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  }
}
