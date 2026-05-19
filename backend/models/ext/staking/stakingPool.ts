import type * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

export default class stakingPool
  extends Model<stakingPoolAttributes, stakingPoolCreationAttributes>
  implements stakingPoolAttributes
{
  // Primary key
  id!: string;

  // Basic pool information
  name!: string;
  token!: string;
  symbol!: string;
  icon?: string;
  description!: string;
  walletType!: "FIAT" | "SPOT" | "ECO";
  walletChain?: string;

  // Financial parameters
  apr!: number;
  lockPeriod!: number;
  minStake!: number;
  maxStake!: number | null;
  availableToStake!: number;
  earlyWithdrawalFee!: number;
  adminFeePercentage!: number;

  // Configuration
  status!: "ACTIVE" | "INACTIVE" | "COMING_SOON";
  isPromoted!: boolean;
  order!: number;
  earningFrequency!: "DAILY" | "WEEKLY" | "MONTHLY" | "END_OF_TERM";
  autoCompound!: boolean;

  // External information
  externalPoolUrl!: string;
  profitSource!: string;
  fundAllocation!: string;
  risks!: string;
  rewards!: string;

  // Timestamps
  createdAt!: Date;
  updatedAt!: Date;
  deletedAt?: Date;

  // Model initialization
  public static initModel(sequelize: Sequelize.Sequelize): typeof stakingPool {
    return stakingPool.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        name: {
          type: DataTypes.STRING(191),
          allowNull: false,
          validate: {
            notEmpty: { msg: "name: Pool name must not be empty" },
            len: {
              args: [2, 100],
              msg: "name: Length must be between 2 and 100 characters",
            },
          },
        },
        token: {
          type: DataTypes.STRING(50),
          allowNull: false,
          validate: {
            notEmpty: { msg: "token: Token name must not be empty" },
          },
        },
        symbol: {
          type: DataTypes.STRING(10),
          allowNull: false,
          validate: {
            notEmpty: { msg: "symbol: Symbol must not be empty" },
            len: {
              args: [1, 10],
              msg: "symbol: Length must be between 1 and 10 characters",
            },
          },
        },
        icon: {
          type: DataTypes.STRING(191),
          allowNull: true,
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: false,
          validate: {
            notEmpty: { msg: "description: Description must not be empty" },
          },
        },
        walletType: {
          type: DataTypes.ENUM("FIAT", "SPOT", "ECO"),
          allowNull: false,
          defaultValue: "SPOT",
          validate: {
            isIn: {
              args: [["FIAT", "SPOT", "ECO"]],
              msg: "walletType: Must be one of: FIAT, SPOT, ECO",
            },
          },
        },
        walletChain: {
          type: DataTypes.STRING(191),
          allowNull: true,
        },
        apr: {
          type: DataTypes.FLOAT,
          allowNull: false,
          validate: {
            isFloat: { msg: "apr: Must be a valid number" },
            min: { args: [0], msg: "apr: Cannot be negative" },
          },
        },
        lockPeriod: {
          type: DataTypes.INTEGER,
          allowNull: false,
          validate: {
            isInt: { msg: "lockPeriod: Must be an integer" },
            min: { args: [0], msg: "lockPeriod: Cannot be negative" },
          },
        },
        minStake: {
          type: DataTypes.FLOAT,
          allowNull: false,
          validate: {
            isFloat: { msg: "minStake: Must be a valid number" },
            min: { args: [0], msg: "minStake: Cannot be negative" },
          },
        },
        maxStake: {
          type: DataTypes.FLOAT,
          allowNull: true,
          validate: {
            isFloat: { msg: "maxStake: Must be a valid number" },
            min: { args: [0], msg: "maxStake: Cannot be negative" },
            isGreaterThanMinStake(value: number) {
              if (value !== null && value <= this.minStake) {
                throw new Error("maxStake: Must be greater than minStake");
              }
            },
          },
        },
        availableToStake: {
          type: DataTypes.FLOAT,
          allowNull: false,
          defaultValue: 0,
          validate: {
            isFloat: { msg: "availableToStake: Must be a valid number" },
            min: { args: [0], msg: "availableToStake: Cannot be negative" },
          },
        },
        earlyWithdrawalFee: {
          type: DataTypes.FLOAT,
          allowNull: false,
          defaultValue: 0,
          validate: {
            isFloat: { msg: "earlyWithdrawalFee: Must be a valid number" },
            min: { args: [0], msg: "earlyWithdrawalFee: Cannot be negative" },
            max: { args: [100], msg: "earlyWithdrawalFee: Cannot exceed 100%" },
          },
        },
        adminFeePercentage: {
          type: DataTypes.FLOAT,
          allowNull: false,
          defaultValue: 0,
          validate: {
            isFloat: { msg: "adminFeePercentage: Must be a valid number" },
            min: { args: [0], msg: "adminFeePercentage: Cannot be negative" },
            max: { args: [100], msg: "adminFeePercentage: Cannot exceed 100%" },
          },
        },
        status: {
          type: DataTypes.ENUM("ACTIVE", "INACTIVE", "COMING_SOON"),
          allowNull: false,
          defaultValue: "INACTIVE",
          validate: {
            isIn: {
              args: [["ACTIVE", "INACTIVE", "COMING_SOON"]],
              msg: "status: Must be one of: ACTIVE, INACTIVE, COMING_SOON",
            },
          },
        },
        isPromoted: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        order: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
          validate: {
            isInt: { msg: "order: Must be an integer" },
            min: { args: [0], msg: "order: Cannot be negative" },
          },
        },
        earningFrequency: {
          type: DataTypes.ENUM("DAILY", "WEEKLY", "MONTHLY", "END_OF_TERM"),
          allowNull: false,
          defaultValue: "DAILY",
          validate: {
            isIn: {
              args: [["DAILY", "WEEKLY", "MONTHLY", "END_OF_TERM"]],
              msg: "earningFrequency: Must be one of: DAILY, WEEKLY, MONTHLY, END_OF_TERM",
            },
          },
        },
        autoCompound: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        externalPoolUrl: {
          type: DataTypes.STRING(191),
          allowNull: true,
          validate: {
            isValidOptionalUrl(value: string) {
              // Only validate URL format if value is provided
              if (value && value.trim() !== "") {
                const urlRegex = /^https?:\/\/.+/i;
                if (!urlRegex.test(value)) {
                  throw new Error("externalPoolUrl: Must be a valid URL");
                }
              }
            },
          },
        },
        profitSource: {
          type: DataTypes.TEXT,
          allowNull: false,
          validate: {
            notEmpty: { msg: "profitSource: Profit source must not be empty" },
          },
        },
        fundAllocation: {
          type: DataTypes.TEXT,
          allowNull: false,
          validate: {
            notEmpty: {
              msg: "fundAllocation: Fund allocation must not be empty",
            },
          },
        },
        risks: {
          type: DataTypes.TEXT,
          allowNull: false,
          validate: {
            notEmpty: { msg: "risks: Risks must not be empty" },
          },
        },
        rewards: {
          type: DataTypes.TEXT,
          allowNull: false,
          validate: {
            notEmpty: { msg: "rewards: Rewards must not be empty" },
          },
        },
      },
      {
        sequelize,
        modelName: "stakingPool",
        tableName: "staking_pools",
        paranoid: true, // Enable soft deletes
        timestamps: true,
        indexes: [
          {
            name: "PRIMARY",
            unique: true,
            fields: [{ name: "id" }],
          },
          {
            name: "staking_pools_token_idx",
            fields: [{ name: "token" }],
          },
          {
            name: "staking_pools_status_idx",
            fields: [{ name: "status" }],
          },
          {
            name: "staking_pools_order_idx",
            fields: [{ name: "order" }],
          },
        ],
      }
    );
  }

  public static associate(models: any) {
    stakingPool.hasMany(models.stakingPosition, {
      foreignKey: "poolId",
      as: "positions",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    stakingPool.hasMany(models.stakingAdminEarning, {
      foreignKey: "poolId",
      as: "adminEarnings",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    stakingPool.hasMany(models.stakingExternalPoolPerformance, {
      foreignKey: "poolId",
      as: "performances",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  }
}
