import type * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";
import type { CopyTradingMarketType } from "./copyTradingLeaderMarket";

export interface copyTradingFollowerAllocationAttributes {
  id: string;
  followerId: string;
  symbol: string;
  // SPOT allocations use base+quote budgets; BINARY allocations use ONLY the
  // quote pair (quoteAmount = stake budget, quoteUsedAmount = stakes locked in
  // open binary orders) and keep baseAmount/baseUsedAmount at 0.
  marketType: CopyTradingMarketType;
  baseAmount: number;
  baseUsedAmount: number; // Actual state: amount currently locked in open trades
  quoteAmount: number;
  quoteUsedAmount: number; // Actual state: amount currently locked in open trades
  // Note: Statistics (totalProfit, totalTrades, winRate) are now calculated on-demand
  // using stats-calculator.ts - no longer stored in DB
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface copyTradingFollowerAllocationCreationAttributes
  extends Omit<
    copyTradingFollowerAllocationAttributes,
    | "id"
    | "createdAt"
    | "updatedAt"
    | "baseUsedAmount"
    | "quoteUsedAmount"
  > {}

export default class copyTradingFollowerAllocation
  extends Model<
    copyTradingFollowerAllocationAttributes,
    copyTradingFollowerAllocationCreationAttributes
  >
  implements copyTradingFollowerAllocationAttributes
{
  id!: string;
  followerId!: string;
  symbol!: string;
  marketType!: CopyTradingMarketType;
  baseAmount!: number;
  baseUsedAmount!: number; // Actual state: locked in open trades
  quoteAmount!: number;
  quoteUsedAmount!: number; // Actual state: locked in open trades
  // Note: Statistics removed - calculated on-demand via stats-calculator.ts
  isActive!: boolean;
  createdAt!: Date;
  updatedAt!: Date;

  public static initModel(
    sequelize: Sequelize.Sequelize
  ): typeof copyTradingFollowerAllocation {
    return copyTradingFollowerAllocation.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        followerId: {
          type: DataTypes.UUID,
          allowNull: false,
          validate: {
            notNull: { msg: "followerId: Follower ID is required" },
          },
        },
        symbol: {
          type: DataTypes.STRING(20),
          allowNull: false,
        },
        marketType: {
          type: DataTypes.ENUM("SPOT", "BINARY"),
          allowNull: false,
          defaultValue: "SPOT",
        },
        baseAmount: {
          type: DataTypes.FLOAT,
          allowNull: false,
          defaultValue: 0,
          validate: {
            min: { args: [0], msg: "baseAmount: Cannot be negative" },
          },
        },
        baseUsedAmount: {
          type: DataTypes.FLOAT,
          allowNull: false,
          defaultValue: 0,
        },
        quoteAmount: {
          type: DataTypes.FLOAT,
          allowNull: false,
          defaultValue: 0,
          validate: {
            min: { args: [0], msg: "quoteAmount: Cannot be negative" },
          },
        },
        quoteUsedAmount: {
          type: DataTypes.FLOAT,
          allowNull: false,
          defaultValue: 0,
        },
        // Note: Statistics columns (totalProfit, totalTrades, winRate) removed
        // - calculated on-demand via stats-calculator.ts
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
        modelName: "copyTradingFollowerAllocation",
        tableName: "copy_trading_follower_allocations",
        timestamps: true,
        indexes: [
          {
            name: "PRIMARY",
            unique: true,
            fields: [{ name: "id" }],
          },
          // v2: includes marketType so a follower can hold a SPOT and a BINARY
          // allocation on the same symbol. Legacy 2-column unique is dropped at
          // boot by ensureBinaryCopySchema().
          {
            name: "copy_trading_follower_alloc_unique_v2",
            unique: true,
            fields: [
              { name: "followerId" },
              { name: "symbol" },
              { name: "marketType" },
            ],
          },
          {
            name: "copy_trading_follower_alloc_follower_idx",
            fields: [{ name: "followerId" }],
          },
          {
            name: "copy_trading_follower_alloc_symbol_idx",
            fields: [{ name: "symbol" }],
          },
        ],
      }
    );
  }

  public static associate(models: any) {
    copyTradingFollowerAllocation.belongsTo(models.copyTradingFollower, {
      foreignKey: "followerId",
      as: "follower",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  }
}
