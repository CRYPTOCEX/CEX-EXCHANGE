import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";
import forexDuration from "./forexDuration";
import forexPlan from "./forexPlan";

export default class forexInvestment
  extends Model<forexInvestmentAttributes, forexInvestmentCreationAttributes>
  implements forexInvestmentAttributes
{
  id!: string;
  userId!: string;
  planId?: string;
  durationId?: string;
  amount?: number;
  profit?: number;
  result?: "WIN" | "LOSS" | "DRAW";
  status!: "ACTIVE" | "COMPLETED" | "CANCELLED" | "REJECTED";
  endDate?: Date;
  createdAt?: Date;
  deletedAt?: Date;
  updatedAt?: Date;

  // forexInvestment belongsTo forexDuration via durationId
  duration!: forexDuration;
  getDuration!: Sequelize.BelongsToGetAssociationMixin<forexDuration>;
  setDuration!: Sequelize.BelongsToSetAssociationMixin<
    forexDuration,
    forexDurationId
  >;
  createDuration!: Sequelize.BelongsToCreateAssociationMixin<forexDuration>;
  // forexInvestment belongsTo forexPlan via planId
  plan!: forexPlan;
  getPlan!: Sequelize.BelongsToGetAssociationMixin<forexPlan>;
  setPlan!: Sequelize.BelongsToSetAssociationMixin<forexPlan, forexPlanId>;
  createPlan!: Sequelize.BelongsToCreateAssociationMixin<forexPlan>;
  public static initModel(
    sequelize: Sequelize.Sequelize
  ): typeof forexInvestment {
    return forexInvestment.init(
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
            isUUID: { args: 4, msg: "userId: User ID must be a valid UUID" },
          },
        },
        planId: {
          type: DataTypes.UUID,
          allowNull: true,
          validate: {
            isUUID: { args: 4, msg: "planId: Plan ID must be a valid UUID" },
          },
        },
        durationId: {
          type: DataTypes.UUID,
          allowNull: true,
          validate: {
            isUUID: {
              args: 4,
              msg: "durationId: Duration ID must be a valid UUID",
            },
          },
        },
        amount: {
          type: DataTypes.DOUBLE,
          allowNull: true,
          validate: {
            isFloat: { msg: "amount: Amount must be a number" },
          },
        },
        profit: {
          type: DataTypes.DOUBLE,
          allowNull: true,
          validate: {
            isFloat: { msg: "profit: Profit must be a number" },
          },
        },
        result: {
          type: DataTypes.ENUM("WIN", "LOSS", "DRAW"),
          allowNull: true,
          validate: {
            isIn: {
              args: [["WIN", "LOSS", "DRAW"]],
              msg: "result: Result must be WIN, LOSS, or DRAW",
            },
          },
        },
        status: {
          type: DataTypes.ENUM("ACTIVE", "COMPLETED", "CANCELLED", "REJECTED"),
          allowNull: false,
          defaultValue: "ACTIVE",
          validate: {
            isIn: {
              args: [["ACTIVE", "COMPLETED", "CANCELLED", "REJECTED"]],
              msg: "status: Status must be ACTIVE, COMPLETED, CANCELLED, or REJECTED",
            },
          },
        },
        endDate: {
          type: DataTypes.DATE(3),
          allowNull: true,
        },
      },
      {
        sequelize,
        modelName: "forexInvestment",
        tableName: "forex_investment",
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
            name: "forexInvestmentIdKey",
            unique: true,
            using: "BTREE",
            fields: [{ name: "id" }],
          },
          {
            name: "forexInvestmentUserIdFkey",
            using: "BTREE",
            fields: [{ name: "userId" }],
          },
          {
            name: "forexInvestmentPlanIdFkey",
            using: "BTREE",
            fields: [{ name: "planId" }],
          },
          {
            name: "forexInvestmentDurationIdFkey",
            using: "BTREE",
            fields: [{ name: "durationId" }],
          },
          {
            name: "forexInvestmentStatusIndex",
            unique: true,
            using: "BTREE",
            fields: ["userId", "planId", "status"],
            where: {
              status: "ACTIVE",
            },
          },
        ],
      }
    );
  }
  public static associate(models: any) {
    forexInvestment.belongsTo(models.forexPlan, {
      as: "plan",
      foreignKey: "planId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    forexInvestment.belongsTo(models.forexDuration, {
      as: "duration",
      foreignKey: "durationId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    forexInvestment.belongsTo(models.user, {
      as: "user",
      foreignKey: "userId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  }
}
