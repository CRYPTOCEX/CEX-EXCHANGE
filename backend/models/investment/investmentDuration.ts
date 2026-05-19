import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

export default class investmentDuration
  extends Model<
    investmentDurationAttributes,
    investmentDurationCreationAttributes
  >
  implements investmentDurationAttributes
{
  id!: string;
  duration!: number;
  timeframe!: "HOUR" | "DAY" | "WEEK" | "MONTH";

  public static initModel(
    sequelize: Sequelize.Sequelize
  ): typeof investmentDuration {
    return investmentDuration.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
          comment: "Unique identifier for the investment duration option",
        },
        duration: {
          type: DataTypes.INTEGER,
          allowNull: false,
          validate: {
            isInt: { msg: "duration: Duration must be an integer" },
          },
          comment: "Duration value (number of timeframe units)",
        },
        timeframe: {
          type: DataTypes.ENUM("HOUR", "DAY", "WEEK", "MONTH"),
          allowNull: false,
          validate: {
            isIn: {
              args: [["HOUR", "DAY", "WEEK", "MONTH"]],
              msg: "timeframe: Timeframe must be one of HOUR, DAY, WEEK, MONTH",
            },
          },
          comment: "Time unit for the duration (HOUR, DAY, WEEK, MONTH)",
        },
      },
      {
        sequelize,
        modelName: "investmentDuration",
        tableName: "investment_duration",
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
    investmentDuration.hasMany(models.investment, {
      as: "investments",
      foreignKey: "durationId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    investmentDuration.hasMany(models.investmentPlanDuration, {
      as: "investmentPlanDurations",
      foreignKey: "durationId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    investmentDuration.belongsToMany(models.investmentPlan, {
      through: models.investmentPlanDuration,
      as: "plans",
      foreignKey: "durationId",
      otherKey: "planId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  }
}
