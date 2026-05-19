import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

export default class investmentPlan
  extends Model<investmentPlanAttributes, investmentPlanCreationAttributes>
  implements investmentPlanAttributes
{
  id!: string;
  name!: string;
  title!: string;
  image?: string;
  description!: string;
  currency!: string;
  walletType!: string;
  minAmount!: number;
  maxAmount!: number;
  profitPercentage!: number;
  invested!: number;
  minProfit!: number;
  maxProfit!: number;
  defaultProfit!: number;
  defaultResult!: "WIN" | "LOSS" | "DRAW";
  trending?: boolean;
  status!: boolean;
  createdAt?: Date;
  deletedAt?: Date;
  updatedAt?: Date;

  public static initModel(
    sequelize: Sequelize.Sequelize
  ): typeof investmentPlan {
    return investmentPlan.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
          comment: "Unique identifier for the investment plan",
        },
        name: {
          type: DataTypes.STRING(191),
          allowNull: false,
          unique: "investmentPlanNameKey",
          validate: {
            notEmpty: { msg: "name: Name cannot be empty" },
          },
          comment: "Unique name identifier for the investment plan",
        },
        title: {
          type: DataTypes.STRING(191),
          allowNull: false,
          validate: {
            notEmpty: { msg: "title: Title cannot be empty" },
          },
          comment: "Display title of the investment plan shown to users",
        },
        image: {
          type: DataTypes.STRING(191),
          allowNull: true,
          validate: {
            is: {
              args: ["^/(uploads|img)/.*$", "i"],
              msg: "image: image must be a valid URL",
            },
          },
          comment: "URL path to the plan's image/logo",
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: false,
          validate: {
            notEmpty: { msg: "description: Description cannot be empty" },
          },
          comment: "Detailed description of the investment plan",
        },
        currency: {
          type: DataTypes.STRING(191),
          allowNull: false,
          validate: {
            notEmpty: { msg: "currency: Currency cannot be empty" },
          },
          comment: "Currency code that this plan accepts for investment",
        },
        walletType: {
          type: DataTypes.STRING(191),
          allowNull: false,
          validate: {
            notEmpty: { msg: "walletType: Wallet type cannot be empty" },
          },
          comment: "Type of wallet (e.g., 'crypto', 'fiat') that this plan uses",
        },
        minAmount: {
          type: DataTypes.DOUBLE,
          allowNull: false,
          validate: {
            isFloat: {
              msg: "minAmount: Minimum amount must be a valid number",
            },
          },
          comment: "Minimum amount of investment required for this plan",
        },
        maxAmount: {
          type: DataTypes.DOUBLE,
          allowNull: false,
          validate: {
            isFloat: {
              msg: "maxAmount: Maximum amount must be a valid number",
            },
          },
          comment: "Maximum amount of investment allowed for this plan",
        },
        invested: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
          validate: {
            isInt: { msg: "invested: Invested value must be an integer" },
          },
          comment: "Total amount of money invested in this plan",
        },
        profitPercentage: {
          type: DataTypes.DOUBLE,
          allowNull: false,
          defaultValue: 0,
          validate: {
            isFloat: {
              msg: "profitPercentage: Profit percentage must be a number",
            },
          },
          comment: "Expected profit percentage for this plan",
        },
        minProfit: {
          type: DataTypes.DOUBLE,
          allowNull: false,
          validate: {
            isFloat: { msg: "minProfit: Minimum profit must be a number" },
          },
          comment: "Minimum profit amount for this plan",
        },
        maxProfit: {
          type: DataTypes.DOUBLE,
          allowNull: false,
          validate: {
            isFloat: { msg: "maxProfit: Maximum profit must be a number" },
          },
          comment: "Maximum profit amount for this plan",
        },
        defaultProfit: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
          validate: {
            isInt: { msg: "defaultProfit: Default profit must be an integer" },
          },
          comment: "Default profit amount for this plan",
        },
        defaultResult: {
          type: DataTypes.ENUM("WIN", "LOSS", "DRAW"),
          allowNull: false,
          validate: {
            isIn: {
              args: [["WIN", "LOSS", "DRAW"]],
              msg: "defaultResult: Must be one of 'WIN', 'LOSS', 'DRAW'",
            },
          },
          comment: "Default outcome for this plan (WIN, LOSS, DRAW)",
        },
        trending: {
          type: DataTypes.BOOLEAN,
          allowNull: true,
          defaultValue: false,
          validate: {
            isBoolean: { msg: "trending: Trending must be a boolean value" },
          },
          comment: "Indicates if this plan is currently trending or popular",
        },
        status: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
          validate: {
            isBoolean: { msg: "status: Status must be a boolean value" },
          },
          comment: "Indicates if this investment plan is active or inactive",
        },
      },
      {
        sequelize,
        modelName: "investmentPlan",
        tableName: "investment_plan",
        timestamps: true,
        paranoid: true,
        indexes: [
          {
            name: "PRIMARY",
            unique: true,
            using: "BTREE",
            fields: [{ name: "id" }],
          },
          {
            name: "investmentPlanNameKey",
            unique: true,
            using: "BTREE",
            fields: [{ name: "name" }],
          },
        ],
      }
    );
  }
  public static associate(models: any) {
    investmentPlan.hasMany(models.investment, {
      as: "investments",
      foreignKey: "planId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    investmentPlan.hasMany(models.investmentPlanDuration, {
      as: "planDurations",
      foreignKey: "planId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    investmentPlan.belongsToMany(models.investmentDuration, {
      through: models.investmentPlanDuration,
      as: "durations",
      foreignKey: "planId",
      otherKey: "durationId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  }
}
