import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

export default class paymentIntentProduct
  extends Model<
    paymentIntentProductAttributes,
    paymentIntentProductCreationAttributes
  >
  implements paymentIntentProductAttributes
{
  id!: string;
  paymentIntentId!: string;
  name!: string;
  quantity!: number;
  price!: number;
  currency!: string;
  sku!: string;
  image!: string | null; // Added image field

  static initModel(
    sequelize: Sequelize.Sequelize
  ): typeof paymentIntentProduct {
    return paymentIntentProduct.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        paymentIntentId: {
          type: DataTypes.UUID,
          allowNull: false,
        },
        name: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        quantity: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
        price: {
          type: DataTypes.FLOAT,
          allowNull: false,
        },
        currency: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        sku: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        image: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
      },
      {
        sequelize,
        modelName: "paymentIntentProduct",
        tableName: "payment_intent_product",
        timestamps: true,
      }
    );
  }
}
