import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

export default class p2pTrade
  extends Model<p2pTradeAttributes, p2pTradeCreationAttributes>
  implements p2pTradeAttributes
{
  id!: string;
  offerId!: string;
  buyerId!: string;
  sellerId!: string;
  type!: "BUY" | "SELL";
  currency!: string;
  amount!: number;
  price!: number;
  total!: number;
  status!: "PENDING" | "PAYMENT_SENT" | "COMPLETED" | "CANCELLED" | "DISPUTED";
  paymentMethod!: string;
  paymentDetails?: any;
  timeline?: any;
  terms?: string;
  escrowFee?: string;
  escrowTime?: string;
  paymentConfirmedAt?: Date;
  paymentReference?: string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;

  public static initModel(sequelize: Sequelize.Sequelize): typeof p2pTrade {
    return p2pTrade.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        offerId: {
          type: DataTypes.UUID,
          allowNull: false,
          validate: {
            notNull: { msg: "offerId cannot be null" },
            isUUID: { args: 4, msg: "offerId must be a valid UUID" },
          },
        },
        buyerId: {
          type: DataTypes.UUID,
          allowNull: false,
          validate: {
            notNull: { msg: "buyerId cannot be null" },
            isUUID: { args: 4, msg: "buyerId must be a valid UUID" },
          },
        },
        sellerId: {
          type: DataTypes.UUID,
          allowNull: false,
          validate: {
            notNull: { msg: "sellerId cannot be null" },
            isUUID: { args: 4, msg: "sellerId must be a valid UUID" },
          },
        },
        type: {
          type: DataTypes.ENUM("BUY", "SELL"),
          allowNull: false,
          validate: {
            isIn: { args: [["BUY", "SELL"]], msg: "type must be BUY or SELL" },
          },
        },
        currency: {
          type: DataTypes.STRING(50),
          allowNull: false,
          validate: { notEmpty: { msg: "currency must not be empty" } },
        },
        amount: {
          type: DataTypes.DOUBLE,
          allowNull: false,
          validate: {
            isFloat: { msg: "amount must be a valid number" },
            min: { args: [0], msg: "amount cannot be negative" },
          },
        },
        price: {
          type: DataTypes.DOUBLE,
          allowNull: false,
          validate: {
            isFloat: { msg: "price must be a valid number" },
            min: { args: [0], msg: "price cannot be negative" },
          },
        },
        total: {
          type: DataTypes.DOUBLE,
          allowNull: false,
          validate: {
            isFloat: { msg: "total must be a valid number" },
            min: { args: [0], msg: "total cannot be negative" },
          },
        },
        status: {
          type: DataTypes.ENUM(
            "PENDING",
            "PAYMENT_SENT",
            "COMPLETED",
            "CANCELLED",
            "DISPUTED"
          ),
          allowNull: false,
          defaultValue: "PENDING",
          validate: {
            isIn: {
              args: [
                [
                  "PENDING",
                  "PAYMENT_SENT",
                  "COMPLETED",
                  "CANCELLED",
                  "DISPUTED",
                ],
              ],
              msg: "Invalid status",
            },
          },
        },
        paymentMethod: {
          type: DataTypes.STRING(50),
          allowNull: false,
          validate: { notEmpty: { msg: "paymentMethod must not be empty" } },
        },
        paymentDetails: {
          type: DataTypes.JSON,
          allowNull: true,
        },
        timeline: {
          type: DataTypes.JSON,
          allowNull: true,
        },
        terms: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        escrowFee: {
          type: DataTypes.STRING(50),
          allowNull: true,
        },
        escrowTime: {
          type: DataTypes.STRING(50),
          allowNull: true,
        },
        paymentConfirmedAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        paymentReference: {
          type: DataTypes.STRING(191),
          allowNull: true,
        },
      },
      {
        sequelize,
        modelName: "p2pTrade",
        tableName: "p2p_trades",
        timestamps: true,
        paranoid: true,
      }
    );
  }

  public static associate(models: any) {
    p2pTrade.belongsTo(models.user, {
      as: "buyer",
      foreignKey: "buyerId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    p2pTrade.belongsTo(models.user, {
      as: "seller",
      foreignKey: "sellerId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    p2pTrade.belongsTo(models.p2pOffer, {
      as: "offer",
      foreignKey: "offerId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    p2pTrade.hasOne(models.p2pDispute, {
      as: "dispute",
      foreignKey: "tradeId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    p2pTrade.hasMany(models.p2pReview, {
      as: "reviews",
      foreignKey: "tradeId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  }
}
