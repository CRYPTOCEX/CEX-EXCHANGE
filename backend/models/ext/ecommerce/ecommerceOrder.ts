import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";
import ecommerceOrderItem from "./ecommerceOrderItem";

export default class ecommerceOrder
  extends Model<ecommerceOrderAttributes, ecommerceOrderCreationAttributes>
  implements ecommerceOrderAttributes
{
  id!: string;
  userId!: string;
  status!: "PENDING" | "COMPLETED" | "CANCELLED" | "REJECTED";
  subtotal?: number;
  discount?: number;
  shippingCost?: number;
  tax?: number;
  total?: number;
  currency?: string;
  walletType?: string;
  createdAt?: Date;
  deletedAt?: Date;
  updatedAt?: Date;
  shippingId?: string;

  // ecommerceOrder hasMany ecommerceOrderItem via orderId
  ecommerceOrderItems!: ecommerceOrderItem[];
  /** @alias ecommerceOrderItems */
  get orderItems(): ecommerceOrderItem[] { return this.ecommerceOrderItems; }
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

  public static initModel(
    sequelize: Sequelize.Sequelize
  ): typeof ecommerceOrder {
    return ecommerceOrder.init(
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
        status: {
          type: DataTypes.ENUM("PENDING", "COMPLETED", "CANCELLED", "REJECTED"),
          allowNull: false,
          defaultValue: "PENDING",
          validate: {
            isIn: {
              args: [["PENDING", "COMPLETED", "CANCELLED", "REJECTED"]],
              msg: "status: Must be 'PENDING', 'COMPLETED', 'CANCELLED', or 'REJECTED'",
            },
          },
        },
        shippingId: {
          type: DataTypes.UUID,
          allowNull: true,
        },
        subtotal: {
          type: DataTypes.DOUBLE,
          allowNull: true,
        },
        discount: {
          type: DataTypes.DOUBLE,
          allowNull: true,
          defaultValue: 0,
        },
        shippingCost: {
          type: DataTypes.DOUBLE,
          allowNull: true,
          defaultValue: 0,
        },
        tax: {
          type: DataTypes.DOUBLE,
          allowNull: true,
          defaultValue: 0,
        },
        total: {
          type: DataTypes.DOUBLE,
          allowNull: true,
        },
        currency: {
          type: DataTypes.STRING(191),
          allowNull: true,
        },
        walletType: {
          type: DataTypes.STRING(50),
          allowNull: true,
        },
      },
      {
        sequelize,
        modelName: "ecommerceOrder",
        tableName: "ecommerce_order",
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
            name: "ecommerceOrderIdKey",
            unique: true,
            using: "BTREE",
            fields: [{ name: "id" }],
          },
          {
            name: "ecommerceOrderUserIdFkey",
            using: "BTREE",
            fields: [{ name: "userId" }],
          },
          {
            name: "ecommerceOrderShippingIdFkey",
            using: "BTREE",
            fields: [{ name: "shippingId" }],
          },
        ],
      }
    );
  }
  public static associate(models: any) {
    ecommerceOrder.hasMany(models.ecommerceOrderItem, {
      as: "ecommerceOrderItems",
      foreignKey: "orderId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    ecommerceOrder.belongsToMany(models.ecommerceProduct, {
      as: "products",
      through: models.ecommerceOrderItem,
      foreignKey: "orderId",
      otherKey: "productId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    ecommerceOrder.belongsTo(models.ecommerceShipping, {
      as: "shipping",
      foreignKey: "shippingId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    ecommerceOrder.hasOne(models.ecommerceShippingAddress, {
      as: "shippingAddress",
      foreignKey: "orderId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    ecommerceOrder.belongsTo(models.user, {
      as: "user",
      foreignKey: "userId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  }
}
