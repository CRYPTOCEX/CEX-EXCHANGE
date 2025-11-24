import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";
import paymentIntentProduct from "./paymentIntentProduct";

export default class paymentIntent
  extends Model<paymentIntentAttributes, paymentIntentCreationAttributes>
  implements paymentIntentAttributes
{
  transactionId: string | null;
  description?: string | undefined;
  id!: string;
  userId?: string;
  walletId?: string;
  amount!: number;
  currency!: string;
  tax!: number; // New field
  discount!: number; // New field
  status!: "PENDING" | "COMPLETED" | "FAILED" | "EXPIRED";
  ipnUrl!: string;
  apiKey!: string;
  successUrl!: string;
  failUrl!: string;
  createdAt?: Date;
  updatedAt?: Date;

  // Associations
  products!: paymentIntentProduct[];

  static initModel(sequelize: Sequelize.Sequelize): typeof paymentIntent {
    return paymentIntent.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        userId: {
          type: DataTypes.UUID,
          allowNull: true,
        },
        walletId: {
          type: DataTypes.UUID,
          allowNull: true,
        },
        amount: {
          type: DataTypes.DOUBLE,
          allowNull: false,
          validate: {
            isFloat: { msg: "amount: Amount must be a number" },
          },
        },
        currency: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        tax: {
          type: DataTypes.DOUBLE, // Tax field added
          allowNull: false,
          defaultValue: 0,
          validate: {
            isFloat: { msg: "tax: Tax must be a valid number" },
          },
        },
        discount: {
          type: DataTypes.DOUBLE, // Discount field added
          allowNull: false,
          defaultValue: 0,
          validate: {
            isFloat: { msg: "discount: Discount must be a valid number" },
          },
        },
        status: {
          type: DataTypes.ENUM("PENDING", "COMPLETED", "FAILED", "EXPIRED"),
          allowNull: false,
          defaultValue: "PENDING",
        },
        ipnUrl: {
          type: DataTypes.TEXT,
          allowNull: false,
        },
        apiKey: {
          type: DataTypes.TEXT,
          allowNull: false,
        },
        successUrl: {
          type: DataTypes.TEXT,
          allowNull: false,
        },
        failUrl: {
          type: DataTypes.TEXT,
          allowNull: false,
        },
        transactionId: {
          type: DataTypes.UUID,
          allowNull: true,
          validate: {
            isUUID: { args: 4, msg: "transactionId: Must be a valid UUID" },
          },
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
      },
      {
        sequelize,
        modelName: "paymentIntent",
        tableName: "payment_intent",
        timestamps: true,
      }
    );
  }

  static associate(models: any) {
    paymentIntent.belongsTo(models.user, {
      as: "user",
      foreignKey: "userId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    paymentIntent.belongsTo(models.wallet, {
      as: "wallet",
      foreignKey: "walletId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    paymentIntent.hasMany(models.paymentIntentProduct, {
      as: "products",
      foreignKey: "paymentIntentId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  }
}
