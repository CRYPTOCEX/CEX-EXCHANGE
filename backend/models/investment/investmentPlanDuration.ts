import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

export default class investmentPlanDuration
  extends Model<
    investmentPlanDurationAttributes,
    investmentPlanDurationCreationAttributes
  >
  implements investmentPlanDurationAttributes
{
  id!: string;
  planId!: string;
  durationId!: string;

  public static initModel(
    sequelize: Sequelize.Sequelize
  ): typeof investmentPlanDuration {
    return investmentPlanDuration.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
          comment: "Unique identifier for the plan-duration relationship",
        },
        planId: {
          type: DataTypes.UUID,
          allowNull: false,
          comment: "ID of the investment plan",
        },
        durationId: {
          type: DataTypes.UUID,
          allowNull: false,
          comment: "ID of the duration option available for this plan",
        },
      },
      {
        sequelize,
        modelName: "investmentPlanDuration",
        tableName: "investment_plan_duration",
        timestamps: false,
        indexes: [
          {
            name: "PRIMARY",
            unique: true,
            using: "BTREE",
            fields: [{ name: "id" }],
          },
          {
            name: "idxPlanId",
            using: "BTREE",
            fields: [{ name: "planId" }],
          },
          {
            name: "idxDurationId",
            using: "BTREE",
            fields: [{ name: "durationId" }],
          },
        ],
      }
    );
  }
  public static associate(models: any) {
    investmentPlanDuration.belongsTo(models.investmentDuration, {
      as: "duration",
      foreignKey: "durationId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    investmentPlanDuration.belongsTo(models.investmentPlan, {
      as: "plan",
      foreignKey: "planId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  }
}
