import type * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

// Type definitions
export type LeaderStatus =
  | "PENDING"
  | "ACTIVE"
  | "SUSPENDED"
  | "REJECTED"
  | "INACTIVE";
export type TradingStyle = "SCALPING" | "DAY_TRADING" | "SWING" | "POSITION";
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

export interface copyTradingLeaderAttributes {
  id: string;
  userId: string;

  // Profile
  displayName: string;
  avatar?: string;
  bio?: string;
  tradingStyle: TradingStyle;
  riskLevel: RiskLevel;

  // Configuration
  profitSharePercent: number;
  minFollowAmount: number;
  maxFollowers: number;

  // Note: Statistics (totalFollowers, totalTrades, winRate, totalProfit, totalVolume, roi)
  // are now calculated on-demand using stats-calculator.ts - no longer stored in DB

  // Status
  status: LeaderStatus;
  isPublic: boolean;
  applicationNote?: string;
  rejectionReason?: string;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface copyTradingLeaderCreationAttributes
  extends Omit<
    copyTradingLeaderAttributes,
    | "id"
    | "createdAt"
    | "updatedAt"
    | "deletedAt"
  > {}

export default class copyTradingLeader
  extends Model<
    copyTradingLeaderAttributes,
    copyTradingLeaderCreationAttributes
  >
  implements copyTradingLeaderAttributes
{
  id!: string;
  userId!: string;

  displayName!: string;
  avatar?: string;
  bio?: string;
  tradingStyle!: TradingStyle;
  riskLevel!: RiskLevel;

  profitSharePercent!: number;
  minFollowAmount!: number;
  maxFollowers!: number;

  // Note: Statistics removed - calculated on-demand via stats-calculator.ts

  status!: LeaderStatus;
  isPublic!: boolean;
  applicationNote?: string;
  rejectionReason?: string;

  createdAt!: Date;
  updatedAt!: Date;
  deletedAt?: Date;

  public static initModel(
    sequelize: Sequelize.Sequelize
  ): typeof copyTradingLeader {
    return copyTradingLeader.init(
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
          unique: true,
          validate: {
            notNull: { msg: "userId: User ID is required" },
          },
        },

        // Profile
        displayName: {
          type: DataTypes.STRING(100),
          allowNull: false,
          validate: {
            notEmpty: { msg: "displayName: Display name is required" },
            len: {
              args: [2, 100],
              msg: "displayName: Must be between 2 and 100 characters",
            },
          },
        },
        avatar: {
          type: DataTypes.STRING(500),
          allowNull: true,
        },
        bio: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        tradingStyle: {
          type: DataTypes.ENUM("SCALPING", "DAY_TRADING", "SWING", "POSITION"),
          allowNull: false,
          defaultValue: "DAY_TRADING",
        },
        riskLevel: {
          type: DataTypes.ENUM("LOW", "MEDIUM", "HIGH"),
          allowNull: false,
          defaultValue: "MEDIUM",
        },

        // Configuration
        profitSharePercent: {
          type: DataTypes.FLOAT,
          allowNull: false,
          defaultValue: 10,
          validate: {
            min: { args: [0], msg: "profitSharePercent: Cannot be negative" },
            max: {
              args: [50],
              msg: "profitSharePercent: Cannot exceed 50%",
            },
          },
        },
        minFollowAmount: {
          type: DataTypes.FLOAT,
          allowNull: false,
          defaultValue: 100,
          validate: {
            min: { args: [0], msg: "minFollowAmount: Cannot be negative" },
          },
        },
        maxFollowers: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 100,
          validate: {
            min: { args: [1], msg: "maxFollowers: Must be at least 1" },
          },
        },

        // Note: Statistics columns removed - calculated on-demand via stats-calculator.ts

        // Status
        status: {
          type: DataTypes.ENUM(
            "PENDING",
            "ACTIVE",
            "SUSPENDED",
            "REJECTED",
            "INACTIVE"
          ),
          allowNull: false,
          defaultValue: "PENDING",
        },
        isPublic: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
        applicationNote: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        rejectionReason: {
          type: DataTypes.TEXT,
          allowNull: true,
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
        modelName: "copyTradingLeader",
        tableName: "copy_trading_leaders",
        timestamps: true,
        paranoid: true,
        indexes: [
          {
            name: "PRIMARY",
            unique: true,
            fields: [{ name: "id" }],
          },
          {
            name: "copy_trading_leaders_user_id_idx",
            unique: true,
            fields: [{ name: "userId" }],
          },
          {
            name: "copy_trading_leaders_status_idx",
            fields: [{ name: "status" }],
          },
          {
            name: "copy_trading_leaders_is_public_idx",
            fields: [{ name: "isPublic" }],
          },
          // Note: Removed indexes on winRate and roi (columns no longer exist)
        ],
      }
    );
  }

  public static associate(models: any) {
    copyTradingLeader.belongsTo(models.user, {
      foreignKey: "userId",
      as: "user",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    copyTradingLeader.hasMany(models.copyTradingFollower, {
      foreignKey: "leaderId",
      as: "followers",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    copyTradingLeader.hasMany(models.copyTradingTrade, {
      foreignKey: "leaderId",
      as: "trades",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    copyTradingLeader.hasMany(models.copyTradingTransaction, {
      foreignKey: "leaderId",
      as: "transactions",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    copyTradingLeader.hasMany(models.copyTradingLeaderMarket, {
      foreignKey: "leaderId",
      as: "markets",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  }
}
