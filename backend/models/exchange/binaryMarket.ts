import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

export default class binaryMarket
  extends Model<binaryMarketAttributes, binaryMarketCreationAttributes>
  implements binaryMarketAttributes
{
  id!: string;
  currency!: string;
  pair!: string;
  minAmount?: number;
  maxAmount?: number;
  isTrending?: boolean;
  isHot?: boolean;
  status!: boolean;

  public static initModel(sequelize: Sequelize.Sequelize): typeof binaryMarket {
    return binaryMarket.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        currency: {
          type: DataTypes.STRING(191),
          allowNull: false,
          validate: {
            notEmpty: { msg: "currency: Currency must not be empty" },
          },
          comment: "Base currency symbol (e.g., BTC, ETH)",
        },
        pair: {
          type: DataTypes.STRING(191),
          allowNull: false,
          validate: {
            notEmpty: { msg: "pair: Pair must not be empty" },
          },
          comment: "Trading pair symbol (e.g., USDT, USD)",
        },
        minAmount: {
          type: DataTypes.DECIMAL(16, 8),
          allowNull: true,
          defaultValue: 1,
          validate: {
            min: { args: [0], msg: "minAmount: Minimum amount must be non-negative" },
          },
          comment: "Minimum order amount for this market",
        },
        maxAmount: {
          type: DataTypes.DECIMAL(16, 8),
          allowNull: true,
          defaultValue: 10000,
          validate: {
            min: { args: [0], msg: "maxAmount: Maximum amount must be non-negative" },
          },
          comment: "Maximum order amount for this market",
        },
        isTrending: {
          type: DataTypes.BOOLEAN,
          allowNull: true,
          defaultValue: false,
          comment: "Whether this market is currently trending",
        },
        isHot: {
          type: DataTypes.BOOLEAN,
          allowNull: true,
          defaultValue: false,
          comment: "Whether this market is marked as hot/popular",
        },
        status: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
          validate: {
            isBoolean: { msg: "status: Status must be a boolean value" },
          },
          comment: "Market availability status (active/inactive)",
        },
      },
      {
        sequelize,
        modelName: "binaryMarket",
        tableName: "binary_market",
        timestamps: false,
        indexes: [
          {
            name: "PRIMARY",
            unique: true,
            using: "BTREE",
            fields: [{ name: "id" }],
          },
          {
            name: "binaryMarketCurrencyPairKey",
            unique: true,
            using: "BTREE",
            fields: [{ name: "currency" }, { name: "pair" }],
          },
        ],
      }
    );
  }

  public static associate(models: any) {
    // Define associations here if binary-market needs relations to other models
  }
}
