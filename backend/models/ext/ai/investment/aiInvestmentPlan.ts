import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";
import aiInvestment from "./aiInvestment";
import aiInvestmentPlanDuration from "./aiInvestmentPlanDuration";

export default class aiInvestmentPlan
  extends Model<aiInvestmentPlanAttributes, aiInvestmentPlanCreationAttributes>
  implements aiInvestmentPlanAttributes
{
  id!: string;
  name!: string;
  title!: string;
  description?: string;
  image?: string;
  status?: boolean;
  invested!: number;
  profitPercentage!: number;
  minProfit!: number;
  maxProfit!: number;
  minAmount!: number;
  maxAmount!: number;
  trending?: boolean;
  defaultProfit!: number;
  defaultResult!: "WIN" | "LOSS" | "DRAW";
  createdAt?: Date;
  deletedAt?: Date;
  updatedAt?: Date;

  // aiInvestmentPlan hasMany aiInvestment via planId
  aiInvestments!: aiInvestment[];
  getAiTradings!: Sequelize.HasManyGetAssociationsMixin<aiInvestment>;
  setAiTradings!: Sequelize.HasManySetAssociationsMixin<
    aiInvestment,
    aiInvestmentId
  >;
  addAiTrading!: Sequelize.HasManyAddAssociationMixin<
    aiInvestment,
    aiInvestmentId
  >;
  addAiTradings!: Sequelize.HasManyAddAssociationsMixin<
    aiInvestment,
    aiInvestmentId
  >;
  createAiTrading!: Sequelize.HasManyCreateAssociationMixin<aiInvestment>;
  removeAiTrading!: Sequelize.HasManyRemoveAssociationMixin<
    aiInvestment,
    aiInvestmentId
  >;
  removeAiTradings!: Sequelize.HasManyRemoveAssociationsMixin<
    aiInvestment,
    aiInvestmentId
  >;
  hasAiTrading!: Sequelize.HasManyHasAssociationMixin<
    aiInvestment,
    aiInvestmentId
  >;
  hasAiTradings!: Sequelize.HasManyHasAssociationsMixin<
    aiInvestment,
    aiInvestmentId
  >;
  countAiTradings!: Sequelize.HasManyCountAssociationsMixin;
  // aiInvestmentPlan hasMany aiInvestmentPlanDuration via planId
  durations!: aiInvestmentPlanDuration[];
  getDurations!: Sequelize.HasManyGetAssociationsMixin<aiInvestmentPlanDuration>;
  setDurations!: Sequelize.HasManySetAssociationsMixin<
    aiInvestmentPlanDuration,
    aiInvestmentPlanDurationId
  >;
  addDuration!: Sequelize.HasManyAddAssociationMixin<
    aiInvestmentPlanDuration,
    aiInvestmentPlanDurationId
  >;
  addDurations!: Sequelize.HasManyAddAssociationsMixin<
    aiInvestmentPlanDuration,
    aiInvestmentPlanDurationId
  >;
  createDuration!: Sequelize.HasManyCreateAssociationMixin<aiInvestmentPlanDuration>;
  removeDuration!: Sequelize.HasManyRemoveAssociationMixin<
    aiInvestmentPlanDuration,
    aiInvestmentPlanDurationId
  >;
  removeDurations!: Sequelize.HasManyRemoveAssociationsMixin<
    aiInvestmentPlanDuration,
    aiInvestmentPlanDurationId
  >;
  hasDuration!: Sequelize.HasManyHasAssociationMixin<
    aiInvestmentPlanDuration,
    aiInvestmentPlanDurationId
  >;
  hasDurations!: Sequelize.HasManyHasAssociationsMixin<
    aiInvestmentPlanDuration,
    aiInvestmentPlanDurationId
  >;
  countDurations!: Sequelize.HasManyCountAssociationsMixin;

  public static initModel(sequelize: Sequelize.Sequelize): typeof aiInvestmentPlan {
    return aiInvestmentPlan.init(
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
          unique: "aiInvestmentPlanNameKey",
          validate: {
            notEmpty: { msg: "name: Name must not be empty" },
          },
        },
        title: {
          type: DataTypes.STRING(191),
          allowNull: false,
          validate: {
            notEmpty: { msg: "title: Title must not be empty" },
          },
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        image: {
          type: DataTypes.STRING(1000),
          allowNull: true,
          validate: {
            is: {
              args: ["^/(uploads|img)/.*$", "i"],
              msg: "image: Image must be a valid URL",
            },
          },
        },
        status: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
          validate: {
            isBoolean: { msg: "status: Status must be a boolean value" },
          },
        },
        invested: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
          validate: {
            isInt: { msg: "invested: Invested amount must be an integer" },
            min: {
              args: [0],
              msg: "invested: Invested amount cannot be negative",
            },
          },
        },
        profitPercentage: {
          type: DataTypes.DOUBLE,
          allowNull: false,
          defaultValue: 0,
          validate: {
            isFloat: {
              msg: "profitPercentage: Profit percentage must be a number",
            },
            min: {
              args: [0],
              msg: "profitPercentage: Profit percentage cannot be negative",
            },
          },
        },
        minProfit: {
          type: DataTypes.DOUBLE,
          allowNull: false,
          validate: {
            isFloat: { msg: "minProfit: Minimum profit must be a number" },
          },
        },
        maxProfit: {
          type: DataTypes.DOUBLE,
          allowNull: false,
          validate: {
            isFloat: { msg: "maxProfit: Maximum profit must be a number" },
          },
        },
        minAmount: {
          type: DataTypes.DOUBLE,
          allowNull: false,
          defaultValue: 0,
          validate: {
            isFloat: { msg: "minAmount: Minimum amount must be a number" },
            min: {
              args: [0],
              msg: "minAmount: Minimum amount cannot be negative",
            },
          },
        },
        maxAmount: {
          type: DataTypes.DOUBLE,
          allowNull: false,
          validate: {
            isFloat: { msg: "maxAmount: Maximum amount must be a number" },
          },
        },
        trending: {
          type: DataTypes.BOOLEAN,
          allowNull: true,
          defaultValue: false,
        },
        defaultProfit: {
          type: DataTypes.DOUBLE,
          allowNull: false,
          validate: {
            isFloat: { msg: "defaultProfit: Default profit must be a number" },
          },
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
        },
      },
      {
        sequelize,
        modelName: "aiInvestmentPlan",
        tableName: "ai_investment_plan",
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
            name: "aiInvestmentPlanNameKey",
            unique: true,
            using: "BTREE",
            fields: [{ name: "name" }],
          },
        ],
      }
    );
  }
  public static associate(models: any) {
    aiInvestmentPlan.hasMany(models.aiInvestment, {
      as: "investments",
      foreignKey: "planId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    aiInvestmentPlan.hasMany(models.aiInvestmentPlanDuration, {
      as: "planDurations",
      foreignKey: "planId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    aiInvestmentPlan.belongsToMany(models.aiInvestmentDuration, {
      through: models.aiInvestmentPlanDuration,
      as: "durations",
      foreignKey: "planId",
      otherKey: "durationId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  }
}
