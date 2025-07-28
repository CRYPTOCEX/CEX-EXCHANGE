import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";
import ecommerceOrder from "./ecommerceOrder";

export default class ecommerceShippingAddress
  extends Model<
    ecommerceShippingAddressAttributes,
    ecommerceShippingAddressCreationAttributes
  >
  implements ecommerceShippingAddressAttributes
{
  id!: string;
  userId!: string;
  orderId!: string;
  name!: string;
  email!: string;
  phone!: string;
  street!: string;
  city!: string;
  state!: string;
  postalCode!: string;
  country!: string;
  createdAt?: Date;
  updatedAt?: Date;

  // ecommerceShippingAddress belongsTo ecommerceOrder via orderId
  order!: ecommerceOrder;
  getOrder!: Sequelize.BelongsToGetAssociationMixin<ecommerceOrder>;
  setOrder!: Sequelize.BelongsToSetAssociationMixin<
    ecommerceOrder,
    ecommerceOrderId
  >;
  createOrder!: Sequelize.BelongsToCreateAssociationMixin<ecommerceOrder>;

  public static initModel(
    sequelize: Sequelize.Sequelize
  ): typeof ecommerceShippingAddress {
    return ecommerceShippingAddress.init(
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
            notNull: { msg: "userId: User ID cannot be null" },
            isUUID: { args: 4, msg: "userId: User ID must be a valid UUID" },
          },
        },
        orderId: {
          type: DataTypes.UUID,
          allowNull: false,
          validate: {
            notNull: { msg: "orderId: Order ID cannot be null" },
            isUUID: { args: 4, msg: "orderId: Order ID must be a valid UUID" },
          },
        },
        name: {
          type: DataTypes.STRING,
          allowNull: false,
          validate: {
            notEmpty: { msg: "name: Name must not be empty" },
          },
        },
        email: {
          type: DataTypes.STRING,
          allowNull: false,
          defaultValue: "",
          validate: {
            notEmpty: { msg: "email: Email must not be empty" },
            isEmail: { msg: "email: Must be a valid email address" },
          },
        },
        phone: {
          type: DataTypes.STRING,
          allowNull: false,
          validate: {
            notEmpty: { msg: "phone: Phone number must not be empty" },
            isNumeric: { msg: "phone: Must be a numeric value" },
          },
        },
        street: {
          type: DataTypes.STRING,
          allowNull: false,
          validate: {
            notEmpty: { msg: "street: Street address must not be empty" },
          },
        },
        city: {
          type: DataTypes.STRING,
          allowNull: false,
          validate: {
            notEmpty: { msg: "city: City must not be empty" },
          },
        },
        state: {
          type: DataTypes.STRING,
          allowNull: false,
          validate: {
            notEmpty: { msg: "state: State must not be empty" },
          },
        },
        postalCode: {
          type: DataTypes.STRING,
          allowNull: false,
          validate: {
            notEmpty: { msg: "postalCode: Postal code must not be empty" },
          },
        },
        country: {
          type: DataTypes.STRING,
          allowNull: false,
          validate: {
            notEmpty: { msg: "country: Country must not be empty" },
          },
        },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: true,
          defaultValue: Sequelize.NOW,
        },
        updatedAt: {
          type: DataTypes.DATE,
          allowNull: true,
          defaultValue: Sequelize.NOW,
        },
      },
      {
        sequelize,
        modelName: "ecommerceShippingAddress",
        tableName: "ecommerce_shipping_address",
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
    ecommerceShippingAddress.belongsTo(models.ecommerceOrder, {
      as: "order",
      foreignKey: "orderId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    ecommerceShippingAddress.belongsTo(models.user, {
      as: "user",
      foreignKey: "userId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  }
}
