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
  createdAt?: Date;
  deletedAt?: Date;
  updatedAt?: Date;
  shippingId?: string; // Added shippingId

  // ecommerceOrder hasMany ecommerceOrderItem via orderId
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
