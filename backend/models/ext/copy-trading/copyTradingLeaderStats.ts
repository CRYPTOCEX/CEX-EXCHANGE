import type * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

export interface copyTradingLeaderStatsAttributes {
  id: string;
  leaderId: string;
  date: string; // YYYY-MM-DD format

  // Daily Statistics
  trades: number;
  winningTrades: number;
  losingTrades: number;
  volume: number;
  profit: number;
  fees: number;

  // Opening/Closing Equity (for drawdown calculation)
  startEquity: number;
  endEquity: number;
  highEquity: number;
  lowEquity: number;

  // Note: Derived metrics (dailyWinRate, dailyRoi, maxDrawdown) are now calculated
  // on-demand using stats-calculator.ts - no longer stored in DB

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export interface copyTradingLeaderStatsCreationAttributes
  extends Omit<copyTradingLeaderStatsAttributes, "id" | "createdAt" | "updatedAt"> {}

export default class copyTradingLeaderStats
  extends Model<
    copyTradingLeaderStatsAttributes,
    copyTradingLeaderStatsCreationAttributes
  >
  implements copyTradingLeaderStatsAttributes
{
  id!: string;
  leaderId!: string;
  date!: string;

  trades!: number;
  winningTrades!: number;
  losingTrades!: number;
  volume!: number;
  profit!: number;
  fees!: number;

  startEquity!: number;
  endEquity!: number;
  highEquity!: number;
  lowEquity!: number;

  // Note: Derived metrics removed - calculated on-demand via stats-calculator.ts

  createdAt!: Date;
  updatedAt!: Date;

  public static initModel(
    sequelize: Sequelize.Sequelize
  ): typeof copyTradingLeaderStats {
    return copyTradingLeaderStats.init(
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
        date: {
          type: DataTypes.DATEONLY,
          allowNull: false,
        },

        // Daily Statistics
        trades: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        winningTrades: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        losingTrades: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        volume: {
          type: DataTypes.FLOAT,
          allowNull: false,
          defaultValue: 0,
        },
        profit: {
          type: DataTypes.FLOAT,
          allowNull: false,
          defaultValue: 0,
        },
        fees: {
          type: DataTypes.FLOAT,
          allowNull: false,
          defaultValue: 0,
        },

        // Equity tracking
        startEquity: {
          type: DataTypes.FLOAT,
          allowNull: false,
          defaultValue: 0,
        },
        endEquity: {
          type: DataTypes.FLOAT,
          allowNull: false,
          defaultValue: 0,
        },
        highEquity: {
          type: DataTypes.FLOAT,
          allowNull: false,
          defaultValue: 0,
        },
        lowEquity: {
          type: DataTypes.FLOAT,
          allowNull: false,
          defaultValue: 0,
        },

        // Note: Derived metrics (dailyWinRate, dailyRoi, maxDrawdown) removed
        // - calculated on-demand via stats-calculator.ts

        // Timestamps
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
        modelName: "copyTradingLeaderStats",
        tableName: "copy_trading_leader_stats",
        timestamps: true,
        indexes: [
          {
            name: "PRIMARY",
            unique: true,
            fields: [{ name: "id" }],
          },
          {
            name: "copy_trading_leader_stats_leader_date_idx",
            unique: true,
            fields: [{ name: "leaderId" }, { name: "date" }],
          },
          {
            name: "copy_trading_leader_stats_leader_id_idx",
            fields: [{ name: "leaderId" }],
          },
          {
            name: "copy_trading_leader_stats_date_idx",
            fields: [{ name: "date" }],
          },
        ],
      }
    );
  }

  public static associate(models: any) {
    copyTradingLeaderStats.belongsTo(models.copyTradingLeader, {
      foreignKey: "leaderId",
      as: "leader",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  }
}
