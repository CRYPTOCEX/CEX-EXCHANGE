import type * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

export interface copyTradingLeaderMarketAttributes {
  id: string;
  leaderId: string;
  symbol: string;
  baseCurrency: string;
  quoteCurrency: string;
  minBase: number;
  minQuote: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface copyTradingLeaderMarketCreationAttributes
  extends Omit<
    copyTradingLeaderMarketAttributes,
    "id" | "createdAt" | "updatedAt"
  > {}

export default class copyTradingLeaderMarket
  extends Model<
    copyTradingLeaderMarketAttributes,
    copyTradingLeaderMarketCreationAttributes
  >
  implements copyTradingLeaderMarketAttributes
{
  id!: string;
  leaderId!: string;
  symbol!: string;
  baseCurrency!: string;
  quoteCurrency!: string;
  minBase!: number;
  minQuote!: number;
  isActive!: boolean;
  createdAt!: Date;
  updatedAt!: Date;

  public static initModel(
    sequelize: Sequelize.Sequelize
  ): typeof copyTradingLeaderMarket {
    return copyTradingLeaderMarket.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        leaderId: {
          type: DataTypes.UUID,
          allowNull: false,
          validate: {
            notNull: { msg: "leaderId: Leader ID is required" },
          },
        },
        symbol: {
          type: DataTypes.STRING(20),
          allowNull: false,
          validate: {
            notEmpty: { msg: "symbol: Symbol is required" },
          },
        },
        baseCurrency: {
          type: DataTypes.STRING(10),
          allowNull: false,
        },
        quoteCurrency: {
          type: DataTypes.STRING(10),
          allowNull: false,
        },
        minBase: {
          type: DataTypes.DOUBLE,
          allowNull: false,
          defaultValue: 0,
        },
        minQuote: {
          type: DataTypes.DOUBLE,
          allowNull: false,
          defaultValue: 0,
        },
        isActive: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
        updatedAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
      },
      {
        sequelize,
        modelName: "copyTradingLeaderMarket",
        tableName: "copy_trading_leader_markets",
        timestamps: true,
        indexes: [
          {
            name: "PRIMARY",
            unique: true,
            fields: [{ name: "id" }],
          },
          {
            name: "copy_trading_leader_markets_unique",
            unique: true,
            fields: [{ name: "leaderId" }, { name: "symbol" }],
          },
          {
            name: "copy_trading_leader_markets_leader_idx",
            fields: [{ name: "leaderId" }],
          },
          {
            name: "copy_trading_leader_markets_symbol_idx",
            fields: [{ name: "symbol" }],
          },
        ],
      }
    );
  }

  public static associate(models: any) {
    copyTradingLeaderMarket.belongsTo(models.copyTradingLeader, {
      foreignKey: "leaderId",
      as: "leader",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  }
}
