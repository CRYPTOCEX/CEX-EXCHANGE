import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";
import forexDuration from "./forexDuration";
import forexPlan from "./forexPlan";

export default class forexPlanDuration
  extends Model<
    forexPlanDurationAttributes,
    forexPlanDurationCreationAttributes
  >
  implements forexPlanDurationAttributes
{
  id!: string;
  planId!: string;
  durationId!: string;

  // forexPlanDuration belongsTo forexDuration via durationId
  duration!: forexDuration;
  getDuration!: Sequelize.BelongsToGetAssociationMixin<forexDuration>;
  setDuration!: Sequelize.BelongsToSetAssociationMixin<
    forexDuration,
    forexDurationId
  >;
  createDuration!: Sequelize.BelongsToCreateAssociationMixin<forexDuration>;
  // forexPlanDuration belongsTo forexPlan via planId
  plan!: forexPlan;
  getPlan!: Sequelize.BelongsToGetAssociationMixin<forexPlan>;
  setPlan!: Sequelize.BelongsToSetAssociationMixin<forexPlan, forexPlanId>;
  createPlan!: Sequelize.BelongsToCreateAssociationMixin<forexPlan>;

  public static initModel(sequelize: Sequelize.Sequelize): typeof forexPlanDuration {
    return forexPlanDuration.init(
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
        },
        durationId: {
          type: DataTypes.UUID,
          allowNull: false,
        },
      },
      {
        sequelize,
        modelName: "forexPlanDuration",
        tableName: "forex_plan_duration",
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
    forexPlanDuration.belongsTo(models.forexDuration, {
      as: "duration",
      foreignKey: "durationId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    forexPlanDuration.belongsTo(models.forexPlan, {
      as: "plan",
      foreignKey: "planId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  }
}
