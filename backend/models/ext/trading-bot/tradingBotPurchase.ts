import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

// Purchase status types
export type PurchaseStatus =
  | "PENDING"
  | "COMPLETED"
  | "REFUNDED"
  | "FAILED";

export interface tradingBotPurchaseAttributes {
  id: string;
  buyerId: string;
  strategyId: string;
  sellerId: string;

  // Transaction
  status: PurchaseStatus;
  price: number;
  currency: string;

  // Fee Breakdown
  platformFee: number;
  platformFeePercent: number;
  sellerAmount: number;

  // Transaction Reference
  transactionId?: string;
  walletId?: string;

  // Strategy Snapshot
  strategySnapshot: Record<string, any>;
  strategyVersion: string;

  // Usage Tracking
  timesUsed: number;
  lastUsedAt?: Date;

  // Rating
  rating?: number;
  review?: string;
  reviewedAt?: Date;

  createdAt?: Date;
  updatedAt?: Date;
}

export interface tradingBotPurchaseCreationAttributes
  extends Omit<
    tradingBotPurchaseAttributes,
    | "id"
    | "status"
    | "timesUsed"
    | "createdAt"
    | "updatedAt"
  > {}

export default class tradingBotPurchase
  extends Model<tradingBotPurchaseAttributes, tradingBotPurchaseCreationAttributes>
  implements tradingBotPurchaseAttributes
{
  id!: string;
  buyerId!: string;
  strategyId!: string;
  sellerId!: string;
  status!: PurchaseStatus;
  price!: number;
  currency!: string;
  platformFee!: number;
  platformFeePercent!: number;
  sellerAmount!: number;
  transactionId?: string;
  walletId?: string;
  strategySnapshot!: Record<string, any>;
  strategyVersion!: string;
  timesUsed!: number;
  lastUsedAt?: Date;
  rating?: number;
  review?: string;
  reviewedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;

  public static initModel(sequelize: Sequelize.Sequelize): typeof tradingBotPurchase {
    return tradingBotPurchase.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        buyerId: {
          type: DataTypes.UUID,
          allowNull: false,
          validate: {
            notEmpty: { msg: "buyerId: Buyer ID must not be empty" },
            isUUID: { args: 4, msg: "buyerId: Must be a valid UUID" },
          },
        },
        strategyId: {
          type: DataTypes.UUID,
          allowNull: false,
          validate: {
            notEmpty: { msg: "strategyId: Strategy ID must not be empty" },
            isUUID: { args: 4, msg: "strategyId: Must be a valid UUID" },
          },
        },
        sellerId: {
          type: DataTypes.UUID,
          allowNull: false,
          validate: {
            notEmpty: { msg: "sellerId: Seller ID must not be empty" },
            isUUID: { args: 4, msg: "sellerId: Must be a valid UUID" },
          },
        },
        status: {
          type: DataTypes.ENUM("PENDING", "COMPLETED", "REFUNDED", "FAILED"),
          allowNull: false,
          defaultValue: "PENDING",
          validate: {
            isIn: {
              args: [["PENDING", "COMPLETED", "REFUNDED", "FAILED"]],
              msg: "status: Must be a valid status",
            },
          },
        },
        price: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
          get() {
            const value = this.getDataValue("price");
            return value ? parseFloat(value.toString()) : 0;
          },
        },
        currency: {
          type: DataTypes.STRING(10),
          allowNull: false,
          defaultValue: "USDT",
        },
        platformFee: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
          get() {
            const value = this.getDataValue("platformFee");
            return value ? parseFloat(value.toString()) : 0;
          },
        },
        platformFeePercent: {
          type: DataTypes.DECIMAL(5, 2),
          allowNull: false,
          get() {
            const value = this.getDataValue("platformFeePercent");
            return value ? parseFloat(value.toString()) : 0;
          },
        },
        sellerAmount: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
          get() {
            const value = this.getDataValue("sellerAmount");
            return value ? parseFloat(value.toString()) : 0;
          },
        },
        transactionId: {
          type: DataTypes.UUID,
          allowNull: true,
        },
        walletId: {
          type: DataTypes.UUID,
          allowNull: true,
        },
        strategySnapshot: {
          type: DataTypes.JSON,
          allowNull: false,
        },
        strategyVersion: {
          type: DataTypes.STRING(20),
          allowNull: false,
        },
        timesUsed: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        lastUsedAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        rating: {
          type: DataTypes.INTEGER,
          allowNull: true,
          validate: {
            min: { args: [1], msg: "rating: Must be at least 1" },
            max: { args: [5], msg: "rating: Must be at most 5" },
          },
        },
        review: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        reviewedAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
      },
      {
        sequelize,
        modelName: "tradingBotPurchase",
        tableName: "trading_bot_purchase",
        timestamps: true,
        indexes: [
          {
            name: "PRIMARY",
            unique: true,
            using: "BTREE",
            fields: [{ name: "id" }],
          },
          {
            name: "tradingBotPurchaseBuyerIdIdx",
            using: "BTREE",
            fields: [{ name: "buyerId" }],
          },
          {
            name: "tradingBotPurchaseStrategyIdIdx",
            using: "BTREE",
            fields: [{ name: "strategyId" }],
          },
          {
            name: "tradingBotPurchaseSellerIdIdx",
            using: "BTREE",
            fields: [{ name: "sellerId" }],
          },
          {
            name: "tradingBotPurchaseStatusIdx",
            using: "BTREE",
            fields: [{ name: "status" }],
          },
          {
            name: "tradingBotPurchaseBuyerStrategyIdx",
            unique: true,
            using: "BTREE",
            fields: [{ name: "buyerId" }, { name: "strategyId" }],
          },
        ],
      }
    );
  }

  public static associate(models: any) {
    tradingBotPurchase.belongsTo(models.user, {
      as: "buyer",
      foreignKey: "buyerId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    tradingBotPurchase.belongsTo(models.user, {
      as: "seller",
      foreignKey: "sellerId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    tradingBotPurchase.belongsTo(models.tradingBotStrategy, {
      as: "strategy",
      foreignKey: "strategyId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    tradingBotPurchase.hasMany(models.tradingBot, {
      as: "bots",
      foreignKey: "purchaseId",
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    });
  }
}
