import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";
import aiInvestmentDuration from "./aiInvestmentDuration";
import aiInvestmentPlan from "./aiInvestmentPlan";

export default class aiInvestmentPlanDuration
  extends Model<
    aiInvestmentPlanDurationAttributes,
    aiInvestmentPlanDurationCreationAttributes
  >
  implements aiInvestmentPlanDurationAttributes
{
  id!: string;
  planId!: string;
  durationId!: string;

  // aiInvestmentPlanDuration belongsTo aiInvestmentDuration via durationId
  duration!: aiInvestmentDuration;
  getDuration!: Sequelize.BelongsToGetAssociationMixin<aiInvestmentDuration>;
  setDuration!: Sequelize.BelongsToSetAssociationMixin<
    aiInvestmentDuration,
    aiInvestmentDurationId
  >;
  createDuration!: Sequelize.BelongsToCreateAssociationMixin<aiInvestmentDuration>;
  // aiInvestmentPlanDuration belongsTo aiInvestmentPlan via planId
  plan!: aiInvestmentPlan;
  getPlan!: Sequelize.BelongsToGetAssociationMixin<aiInvestmentPlan>;
  setPlan!: Sequelize.BelongsToSetAssociationMixin<
    aiInvestmentPlan,
    aiInvestmentPlanId
  >;
  createPlan!: Sequelize.BelongsToCreateAssociationMixin<aiInvestmentPlan>;

  public static initModel(
    sequelize: Sequelize.Sequelize
  ): typeof aiInvestmentPlanDuration {
    return aiInvestmentPlanDuration.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        planId: {
          type: DataTypes.UUID,
          allowNull: false,
          validate: {
            notNull: { msg: "planId: Plan ID cannot be null" },
            isUUID: { args: 4, msg: "planId: Plan ID must be a valid UUID" },
          },
        },
        durationId: {
          type: DataTypes.UUID,
          allowNull: false,
          validate: {
            notNull: { msg: "durationId: Duration ID cannot be null" },
            isUUID: {
              args: 4,
              msg: "durationId: Duration ID must be a valid UUID",
            },
          },
        },
      },
      {
        sequelize,
        modelName: "aiInvestmentPlanDuration",
        tableName: "ai_investment_plan_duration",
        timestamps: false,
        indexes: [
          {
            name: "PRIMARY",
            unique: true,
            using: "BTREE",
            fields: [{ name: "id" }],
          },
          {
            name: "aiInvestmentPlanDurationPlanIdForeign",
            using: "BTREE",
            fields: [{ name: "planId" }],
          },
          {
            name: "aiInvestmentPlanDurationDurationIdForeign",
            using: "BTREE",
            fields: [{ name: "durationId" }],
          },
        ],
      }
    );
  }
  public static associate(models: any) {
    aiInvestmentPlanDuration.belongsTo(models.aiInvestmentDuration, {
      as: "duration",
      foreignKey: "durationId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    aiInvestmentPlanDuration.belongsTo(models.aiInvestmentPlan, {
      as: "plan",
      foreignKey: "planId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  }
}
