import type * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

// Type definitions
export type FollowerStatus = "ACTIVE" | "PAUSED" | "STOPPED";
export type CopyMode = "PROPORTIONAL" | "FIXED_AMOUNT" | "FIXED_RATIO";

export interface copyTradingFollowerAttributes {
  id: string;
  userId: string;
  leaderId: string;

  // Configuration
  copyMode: CopyMode;
  fixedAmount?: number;
  fixedRatio?: number;

  // Risk Management
  maxDailyLoss?: number;
  maxPositionSize?: number;
  stopLossPercent?: number;
  takeProfitPercent?: number;

  // Note: Statistics (totalProfit, totalTrades, winRate, roi)
  // are now calculated on-demand using stats-calculator.ts - no longer stored in DB

  // Status
  status: FollowerStatus;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface copyTradingFollowerCreationAttributes
  extends Omit<
    copyTradingFollowerAttributes,
    | "id"
    | "createdAt"
    | "updatedAt"
    | "deletedAt"
  > {}

export default class copyTradingFollower
  extends Model<
    copyTradingFollowerAttributes,
    copyTradingFollowerCreationAttributes
  >
  implements copyTradingFollowerAttributes
{
  id!: string;
  userId!: string;
  leaderId!: string;

  copyMode!: CopyMode;
  fixedAmount?: number;
  fixedRatio?: number;

  maxDailyLoss?: number;
  maxPositionSize?: number;
  stopLossPercent?: number;
  takeProfitPercent?: number;

  // Note: Statistics removed - calculated on-demand via stats-calculator.ts

  status!: FollowerStatus;

  createdAt!: Date;
  updatedAt!: Date;
  deletedAt?: Date;

  public static initModel(
    sequelize: Sequelize.Sequelize
  ): typeof copyTradingFollower {
    return copyTradingFollower.init(
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
            notNull: { msg: "userId: User ID is required" },
          },
        },
        leaderId: {
          type: DataTypes.UUID,
          allowNull: false,
          validate: {
            notNull: { msg: "leaderId: Leader ID is required" },
          },
        },

        // Configuration
        copyMode: {
          type: DataTypes.ENUM("PROPORTIONAL", "FIXED_AMOUNT", "FIXED_RATIO"),
          allowNull: false,
          defaultValue: "PROPORTIONAL",
        },
        fixedAmount: {
          type: DataTypes.FLOAT,
          allowNull: true,
        },
        fixedRatio: {
          type: DataTypes.FLOAT,
          allowNull: true,
        },

        // Risk Management
        maxDailyLoss: {
          type: DataTypes.FLOAT,
          allowNull: true,
        },
        maxPositionSize: {
          type: DataTypes.FLOAT,
          allowNull: true,
        },
        stopLossPercent: {
          type: DataTypes.FLOAT,
          allowNull: true,
        },
        takeProfitPercent: {
          type: DataTypes.FLOAT,
          allowNull: true,
        },

        // Note: Statistics columns removed - calculated on-demand via stats-calculator.ts

        // Status
        status: {
          type: DataTypes.ENUM("ACTIVE", "PAUSED", "STOPPED"),
          allowNull: false,
          defaultValue: "ACTIVE",
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
        deletedAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
      },
      {
        sequelize,
        modelName: "copyTradingFollower",
        tableName: "copy_trading_followers",
        timestamps: true,
        paranoid: true,
        indexes: [
          {
            name: "PRIMARY",
            unique: true,
            fields: [{ name: "id" }],
          },
          {
            name: "copy_trading_followers_user_leader_idx",
            unique: true,
            fields: [{ name: "userId" }, { name: "leaderId" }],
          },
          {
            name: "copy_trading_followers_user_id_idx",
            fields: [{ name: "userId" }],
          },
          {
            name: "copy_trading_followers_leader_id_idx",
            fields: [{ name: "leaderId" }],
          },
          {
            name: "copy_trading_followers_status_idx",
            fields: [{ name: "status" }],
          },
        ],
      }
    );
  }

  public static associate(models: any) {
    copyTradingFollower.belongsTo(models.user, {
      foreignKey: "userId",
      as: "user",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    copyTradingFollower.belongsTo(models.copyTradingLeader, {
      foreignKey: "leaderId",
      as: "leader",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    copyTradingFollower.hasMany(models.copyTradingTrade, {
      foreignKey: "followerId",
      as: "trades",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    copyTradingFollower.hasMany(models.copyTradingTransaction, {
      foreignKey: "followerId",
      as: "transactions",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    copyTradingFollower.hasMany(models.copyTradingFollowerAllocation, {
      foreignKey: "followerId",
      as: "allocations",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  }
}
