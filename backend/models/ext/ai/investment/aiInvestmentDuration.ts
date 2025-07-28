import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";
import aiInvestment from "./aiInvestment";
import aiInvestmentPlanDuration from "./aiInvestmentPlanDuration";

export default class aiInvestmentDuration
  extends Model<
    aiInvestmentDurationAttributes,
    aiInvestmentDurationCreationAttributes
  >
  implements aiInvestmentDurationAttributes
{
  id!: string;
  duration!: number;
  timeframe!: "HOUR" | "DAY" | "WEEK" | "MONTH";

  // aiInvestmentDuration hasMany aiInvestment via durationId
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
  // aiInvestmentDuration hasMany aiInvestmentPlanDuration via durationId
  aiInvestmentPlanDurations!: aiInvestmentPlanDuration[];
  getAiTradingPlanDurations!: Sequelize.HasManyGetAssociationsMixin<aiInvestmentPlanDuration>;
  setAiTradingPlanDurations!: Sequelize.HasManySetAssociationsMixin<
    aiInvestmentPlanDuration,
    aiInvestmentPlanDurationId
  >;
  addAiTradingPlanDuration!: Sequelize.HasManyAddAssociationMixin<
    aiInvestmentPlanDuration,
    aiInvestmentPlanDurationId
  >;
  addAiTradingPlanDurations!: Sequelize.HasManyAddAssociationsMixin<
    aiInvestmentPlanDuration,
    aiInvestmentPlanDurationId
  >;
  createAiTradingPlanDuration!: Sequelize.HasManyCreateAssociationMixin<aiInvestmentPlanDuration>;
  removeAiTradingPlanDuration!: Sequelize.HasManyRemoveAssociationMixin<
    aiInvestmentPlanDuration,
    aiInvestmentPlanDurationId
  >;
  removeAiTradingPlanDurations!: Sequelize.HasManyRemoveAssociationsMixin<
    aiInvestmentPlanDuration,
    aiInvestmentPlanDurationId
  >;
  hasAiTradingPlanDuration!: Sequelize.HasManyHasAssociationMixin<
    aiInvestmentPlanDuration,
    aiInvestmentPlanDurationId
  >;
  hasAiTradingPlanDurations!: Sequelize.HasManyHasAssociationsMixin<
    aiInvestmentPlanDuration,
    aiInvestmentPlanDurationId
  >;
  countAiTradingPlanDurations!: Sequelize.HasManyCountAssociationsMixin;

  public static initModel(
    sequelize: Sequelize.Sequelize
  ): typeof aiInvestmentDuration {
    return aiInvestmentDuration.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        duration: {
          type: DataTypes.INTEGER,
          allowNull: false,
          validate: {
            isInt: { msg: "duration: Duration must be an integer" },
            min: {
              args: [1],
              msg: "duration: Duration must be at least 1",
            },
          },
        },
        timeframe: {
          type: DataTypes.ENUM("HOUR", "DAY", "WEEK", "MONTH"),
          allowNull: false,
          validate: {
            isIn: {
              args: [["HOUR", "DAY", "WEEK", "MONTH"]],
              msg: "timeframe: Must be one of 'HOUR', 'DAY', 'WEEK', 'MONTH'",
            },
          },
        },
      },
      {
        sequelize,
        modelName: "aiInvestmentDuration",
        tableName: "ai_investment_duration",
        timestamps: false,
        indexes: [
          {
            name: "PRIMARY",
            unique: true,
            using: "BTREE",
            fields: [{ name: "id" }],
          },
        ],
      }
    );
  }

  public static associate(models: any) {
    aiInvestmentDuration.hasMany(models.aiInvestment, {
      as: "investments",
      foreignKey: "durationId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    aiInvestmentDuration.hasMany(models.aiInvestmentPlanDuration, {
      as: "aiInvestmentPlanDurations",
      foreignKey: "durationId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    aiInvestmentDuration.belongsToMany(models.aiInvestmentPlan, {
      through: models.aiInvestmentPlanDuration,
      as: "plans",
      foreignKey: "durationId",
      otherKey: "planId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  }
}
