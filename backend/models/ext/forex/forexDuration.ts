import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";
import forexInvestment from "./forexInvestment";
import forexPlanDuration from "./forexPlanDuration";

export default class forexDuration
  extends Model<forexDurationAttributes, forexDurationCreationAttributes>
  implements forexDurationAttributes
{
  id!: string;
  duration!: number;
  timeframe!: "HOUR" | "DAY" | "WEEK" | "MONTH";

  // forexDuration hasMany forexInvestment via durationId
  forexInvestments!: forexInvestment[];
  getForexInvestments!: Sequelize.HasManyGetAssociationsMixin<forexInvestment>;
  setForexInvestments!: Sequelize.HasManySetAssociationsMixin<
    forexInvestment,
    string
  >;
  addForexInvestment!: Sequelize.HasManyAddAssociationMixin<
    forexInvestment,
    string
  >;
  addForexInvestments!: Sequelize.HasManyAddAssociationsMixin<
    forexInvestment,
    string
  >;
  createForexInvestment!: Sequelize.HasManyCreateAssociationMixin<forexInvestment>;
  removeForexInvestment!: Sequelize.HasManyRemoveAssociationMixin<
    forexInvestment,
    string
  >;
  removeForexInvestments!: Sequelize.HasManyRemoveAssociationsMixin<
    forexInvestment,
    string
  >;
  hasForexInvestment!: Sequelize.HasManyHasAssociationMixin<
    forexInvestment,
    string
  >;
  hasForexInvestments!: Sequelize.HasManyHasAssociationsMixin<
    forexInvestment,
    string
  >;
  countForexInvestments!: Sequelize.HasManyCountAssociationsMixin;
  // forexDuration hasMany forexPlanDuration via durationId
  forexPlanDurations!: forexPlanDuration[];
  getForexPlanDurations!: Sequelize.HasManyGetAssociationsMixin<forexPlanDuration>;
  setForexPlanDurations!: Sequelize.HasManySetAssociationsMixin<
    forexPlanDuration,
    string
  >;
  addForexPlanDuration!: Sequelize.HasManyAddAssociationMixin<
    forexPlanDuration,
    string
  >;
  addForexPlanDurations!: Sequelize.HasManyAddAssociationsMixin<
    forexPlanDuration,
    string
  >;
  createForexPlanDuration!: Sequelize.HasManyCreateAssociationMixin<forexPlanDuration>;
  removeForexPlanDuration!: Sequelize.HasManyRemoveAssociationMixin<
    forexPlanDuration,
    string
  >;
  removeForexPlanDurations!: Sequelize.HasManyRemoveAssociationsMixin<
    forexPlanDuration,
    string
  >;
  hasForexPlanDuration!: Sequelize.HasManyHasAssociationMixin<
    forexPlanDuration,
    string
  >;
  hasForexPlanDurations!: Sequelize.HasManyHasAssociationsMixin<
    forexPlanDuration,
    string
  >;
  countForexPlanDurations!: Sequelize.HasManyCountAssociationsMixin;

  public static initModel(sequelize: Sequelize.Sequelize): typeof forexDuration {
    return forexDuration.init(
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
          },
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
        },
      },
      {
        sequelize,
        modelName: "forexDuration",
        tableName: "forex_duration",
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
    forexDuration.hasMany(models.forexInvestment, {
      as: "investments",
      foreignKey: "durationId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    forexDuration.hasMany(models.forexPlanDuration, {
      as: "forexPlanDurations",
      foreignKey: "durationId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    forexDuration.belongsToMany(models.forexPlan, {
      through: models.forexPlanDuration,
      as: "plans",
      foreignKey: "durationId",
      otherKey: "planId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  }
}
