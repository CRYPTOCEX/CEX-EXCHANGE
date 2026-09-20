import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";
import forexDuration from "./forexDuration";
import forexPlan from "./forexPlan";
import { ANY_UUID_VERSION } from "@b/utils/model-validators";

export default class forexInvestment
  extends Model<forexInvestmentAttributes, forexInvestmentCreationAttributes>
  implements forexInvestmentAttributes
{
  id!: string;
  userId!: string;
  planId?: string;
  durationId?: string;
  amount?: number;
  profit?: number; // DEPRECATED: use roiPercentage. Stored for backward compat only.
  roiPercentage?: number; // Profit as % of amount (e.g., 5 = 5%)
  result?: "WIN" | "LOSS" | "DRAW";
  status!: "ACTIVE" | "COMPLETED" | "CANCELLED" | "REJECTED";
  endDate?: Date;
  metadata?: string;
  termsAcceptedAt?: Date;
  termsVersion?: string;
  createdAt?: Date;
  deletedAt?: Date;
  updatedAt?: Date;

  // forexInvestment belongsTo forexDuration via durationId
  duration!: forexDuration;
  getDuration!: Sequelize.BelongsToGetAssociationMixin<forexDuration>;
  setDuration!: Sequelize.BelongsToSetAssociationMixin<
    forexDuration,
    string
  >;
  createDuration!: Sequelize.BelongsToCreateAssociationMixin<forexDuration>;
  // forexInvestment belongsTo forexPlan via planId
  plan!: forexPlan;
  getPlan!: Sequelize.BelongsToGetAssociationMixin<forexPlan>;
  setPlan!: Sequelize.BelongsToSetAssociationMixin<forexPlan, string>;
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
            isUUID: { args: ANY_UUID_VERSION, msg: "userId: User ID must be a valid UUID" },
          },
        },
        planId: {
          type: DataTypes.UUID,
          allowNull: true,
          validate: {
            isUUID: { args: ANY_UUID_VERSION, msg: "planId: Plan ID must be a valid UUID" },
          },
        },
        durationId: {
          type: DataTypes.UUID,
          allowNull: true,
          validate: {
            isUUID: { args: ANY_UUID_VERSION,
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
          comment: "DEPRECATED: use roiPercentage. Stored for backward compat only.",
          validate: {
            isFloat: { msg: "profit: Profit must be a number" },
          },
        },
        roiPercentage: {
          type: DataTypes.DOUBLE,
          allowNull: true,
          comment: "Profit as percentage of amount (e.g., 5 = 5%)",
          validate: {
            isFloat: { msg: "roiPercentage: ROI percentage must be a number" },
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
        metadata: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        termsAcceptedAt: {
          type: DataTypes.DATE(3),
          allowNull: true,
          validate: {
            isDate: { msg: "termsAcceptedAt: Must be a valid date", args: true },
          },
        },
        termsVersion: {
          type: DataTypes.STRING(50),
          allowNull: true,
          validate: {
            notEmpty: { msg: "termsVersion: Terms version must not be empty" },
          },
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
            // Deliberately NOT unique. It was created unique on
            // (userId, planId, status), which meant a user could hold only one
            // investment per plan per status: a second investment in the same
            // plan failed at creation, and completing one while an earlier
            // COMPLETED row existed threw ER_DUP_ENTRY during settlement — the
            // retry path then cancelled the investment and refunded only the
            // principal, so the user lost the profit they had earned.
            //
            // `unique: false` alone did not fix it: Sequelize's alter sync does
            // not change the uniqueness of an index that already exists, so the
            // constraint stayed live in the database long after the model
            // stopped declaring it. It had to be dropped and recreated.
            //
            // The `where: { status: "ACTIVE" }` clause that used to sit here was
            // also inert — MySQL has no partial indexes — and only made the
            // declaration read as narrower than it was.
            name: "forexInvestmentStatusIndex",
            unique: false,
            using: "BTREE",
            fields: ["userId", "planId", "status"],
          },
          {
            name: "forexInvestmentUserIdStatusIdx",
            using: "BTREE",
            fields: [{ name: "userId" }, { name: "status" }],
          },
          {
            name: "forexInvestmentCreatedAtIdx",
            using: "BTREE",
            fields: [{ name: "createdAt" }],
          },
          {
            name: "forexInvestmentEndDateIdx",
            using: "BTREE",
            fields: [{ name: "endDate" }],
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
