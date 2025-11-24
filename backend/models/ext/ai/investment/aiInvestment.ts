import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";
import aiInvestmentDuration from "./aiInvestmentDuration";
import aiInvestmentPlan from "./aiInvestmentPlan";

export default class aiInvestment
  extends Model<aiInvestmentAttributes, aiInvestmentCreationAttributes>
  implements aiInvestmentAttributes
{
  id!: string;
  userId!: string;
  planId!: string;
  durationId?: string;
  symbol!: string;
  type!: "SPOT" | "ECO";
  amount!: number;
  profit?: number;
  result?: "WIN" | "LOSS" | "DRAW";
  status!: "ACTIVE" | "COMPLETED" | "CANCELLED" | "REJECTED";
  createdAt?: Date;
  deletedAt?: Date;
  updatedAt?: Date;

  // aiInvestment belongsTo aiInvestmentDuration via durationId
  duration!: aiInvestmentDuration;
  getDuration!: Sequelize.BelongsToGetAssociationMixin<aiInvestmentDuration>;
  setDuration!: Sequelize.BelongsToSetAssociationMixin<
    aiInvestmentDuration,
    aiInvestmentDurationId
  >;
  createDuration!: Sequelize.BelongsToCreateAssociationMixin<aiInvestmentDuration>;
  // aiInvestment belongsTo aiInvestmentPlan via planId
  plan!: aiInvestmentPlan;
  getPlan!: Sequelize.BelongsToGetAssociationMixin<aiInvestmentPlan>;
  setPlan!: Sequelize.BelongsToSetAssociationMixin<
    aiInvestmentPlan,
    aiInvestmentPlanId
  >;
  createPlan!: Sequelize.BelongsToCreateAssociationMixin<aiInvestmentPlan>;

  public static initModel(sequelize: Sequelize.Sequelize): typeof aiInvestment {
    return aiInvestment.init(
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
          validate: {
            notNull: { msg: "userId: User ID cannot be null" },
          },
        },
        planId: {
          type: DataTypes.UUID,
          allowNull: false,
          validate: {
            notNull: { msg: "planId: Plan ID cannot be null" },
          },
        },
        durationId: {
          type: DataTypes.UUID,
          allowNull: true,
        },
        symbol: {
          type: DataTypes.STRING(191),
          allowNull: false,
          validate: {
            notEmpty: { msg: "symbol: Market cannot be empty" },
          },
        },
        type: {
          type: DataTypes.ENUM("SPOT", "ECO"),
          allowNull: false,
          validate: {
            isIn: {
              args: [["SPOT", "ECO"]],
              msg: "type: Must be a valid wallet type",
            },
          },
        },
        amount: {
          type: DataTypes.DOUBLE,
          allowNull: false,
          validate: {
            isNumeric: { msg: "amount: Amount must be a number" },
          },
        },
        profit: {
          type: DataTypes.DOUBLE,
          allowNull: true,
          validate: {
            isNumeric: { msg: "profit: Profit must be a number" },
          },
        },
        result: {
          type: DataTypes.ENUM("WIN", "LOSS", "DRAW"),
          allowNull: true,
        },
        status: {
          type: DataTypes.ENUM("ACTIVE", "COMPLETED", "CANCELLED", "REJECTED"),
          allowNull: false,
          defaultValue: "ACTIVE",
          validate: {
            isIn: {
              args: [["ACTIVE", "COMPLETED", "CANCELLED", "REJECTED"]],
              msg: "status: Must be a valid status",
            },
          },
        },
      },
      {
        sequelize,
        modelName: "aiInvestment",
        tableName: "ai_investment",
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
            name: "aiInvestmentIdKey",
            unique: true,
            using: "BTREE",
            fields: [{ name: "id" }],
          },
          {
            name: "aiInvestmentUserIdForeign",
            using: "BTREE",
            fields: [{ name: "userId" }],
          },
          {
            name: "aiInvestmentPlanIdForeign",
            using: "BTREE",
            fields: [{ name: "planId" }],
          },
          {
            name: "aiInvestmentDurationIdForeign",
            using: "BTREE",
            fields: [{ name: "durationId" }],
          },
        ],
      }
    );
  }

  public static associate(models: any) {
    aiInvestment.belongsTo(models.aiInvestmentPlan, {
      as: "plan",
      foreignKey: "planId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    aiInvestment.belongsTo(models.aiInvestmentDuration, {
      as: "duration",
      foreignKey: "durationId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    aiInvestment.belongsTo(models.user, {
      as: "user",
      foreignKey: "userId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  }
}
