import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";
import { ANY_UUID_VERSION } from "@b/utils/model-validators";

export default class investment
  extends Model<investmentAttributes, investmentCreationAttributes>
  implements investmentAttributes
{
  id!: string;
  userId: string;
  planId: string;
  durationId: string;
  amount: number;
  /** DEPRECATED: use roiPercentage. Stored for backward compat only. */
  profit?: number;
  /** Profit as percentage of amount (e.g., 5 = 5%). */
  roiPercentage?: number;
  result?: "WIN" | "LOSS" | "DRAW";
  status!: "ACTIVE" | "COMPLETED" | "CANCELLED" | "REJECTED";
  endDate?: Date;
  createdAt?: Date;
  deletedAt?: Date;
  updatedAt?: Date;

  public static initModel(sequelize: Sequelize.Sequelize): typeof investment {
    return investment.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
          comment: "Unique identifier for the investment record",
        },
        userId: {
          type: DataTypes.UUID,
          allowNull: false,
          validate: {
            notNull: { msg: "userId: User ID cannot be null" },
            isUUID: { args: ANY_UUID_VERSION, msg: "userId: User ID must be a valid UUID" },
          },
          comment: "ID of the user who made this investment",
        },
        planId: {
          type: DataTypes.UUID,
          allowNull: false,
          validate: {
            isUUID: { args: ANY_UUID_VERSION, msg: "planId: Plan ID must be a valid UUID" },
          },
          comment: "ID of the investment plan being invested in",
        },
        durationId: {
          type: DataTypes.UUID,
          allowNull: false,
          validate: {
            isUUID: { args: ANY_UUID_VERSION,
              msg: "durationId: Duration ID must be a valid UUID",
            },
          },
          comment: "ID of the duration period for this investment",
        },
        amount: {
          type: DataTypes.DOUBLE,
          allowNull: false,
          validate: {
            isFloat: { msg: "amount: Amount must be a number" },
          },
          comment: "Amount invested by the user",
        },
        profit: {
          type: DataTypes.DOUBLE,
          allowNull: true,
          validate: {
            isFloat: { msg: "profit: Profit must be a number" },
          },
          comment:
            "DEPRECATED: use roiPercentage. Profit earned from this investment (if completed); kept for backward compat",
        },
        roiPercentage: {
          type: DataTypes.DOUBLE,
          allowNull: true,
          validate: {
            isFloat: { msg: "roiPercentage: ROI percentage must be a number" },
          },
          comment: "Profit as percentage of amount (e.g., 5 = 5%)",
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
          comment: "Final result of the investment (WIN, LOSS, or DRAW)",
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
          comment: "Current status of the investment",
        },
        endDate: {
          type: DataTypes.DATE(3),
          allowNull: true,
          comment: "Date when the investment period ends",
        },
      },
      {
        sequelize,
        modelName: "investment",
        tableName: "investment",
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
            name: "investmentUserIdFkey",
            using: "BTREE",
            fields: [{ name: "userId" }],
          },
          {
            name: "investmentPlanIdFkey",
            using: "BTREE",
            fields: [{ name: "planId" }],
          },
          {
            name: "investmentDurationIdFkey",
            using: "BTREE",
            fields: [{ name: "durationId" }],
          },
          {
            // NOT unique — MySQL ignores partial WHERE on UNIQUE indexes, which made
            // this effectively unconditional and blocked re-investing after cancellation.
            // "One ACTIVE per plan" is now enforced at the application level.
            name: "investmentUserIdPlanIdStatusIdx",
            unique: false,
            using: "BTREE",
            fields: ["userId", "planId", "status"],
          },
        ],
      }
    );
  }
  public static associate(models: any) {
    investment.belongsTo(models.investmentPlan, {
      as: "plan",
      foreignKey: "planId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    investment.belongsTo(models.investmentDuration, {
      as: "duration",
      foreignKey: "durationId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    investment.belongsTo(models.user, {
      as: "user",
      foreignKey: "userId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  }
}
