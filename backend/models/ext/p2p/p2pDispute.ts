import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";
import { ANY_UUID_VERSION } from "@b/utils/model-validators";
import { readJsonArrayColumn, readJsonObjectColumn } from "@b/utils/json-column";

export default class p2pDispute
  extends Model<p2pDisputeAttributes, p2pDisputeCreationAttributes>
  implements p2pDisputeAttributes
{
  id!: string;
  tradeId!: string;
  amount!: string;
  reportedById!: string;
  againstId!: string;
  reason!: string;
  details?: string;
  filedOn!: Date;
  status!: "PENDING" | "IN_PROGRESS" | "RESOLVED";
  priority!: "HIGH" | "MEDIUM" | "LOW";
  resolution?: any;
  resolvedOn?: Date;
  messages?: any;
  evidence?: any;
  activityLog?: any;

  /* --- The respondent's side of the case ---------------------------------
   *
   * A dispute is filed BY one trader AGAINST the other, and until now the
   * accused had no door at all: `dispute.del.ts` lets the raiser withdraw, and
   * the counterparty could do nothing but talk in the trade chat and hope
   * somebody read it. That is the wrong shape for the case a dispute system
   * exists to handle — a FALSE claim — because it leaves the only formal
   * statement on the record belonging to the person making the accusation.
   *
   * These three columns are that door. They are columns rather than another
   * shape inside the `resolution` blob because the operator's queue has to be
   * able to ASK the question: a contested case needs reading before an
   * uncontested one, and a JSON blob cannot be ordered by.
   */
  appealedAt?: Date;
  appealedById?: string;
  appealStatement?: string;

  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;

  public static initModel(sequelize: Sequelize.Sequelize): typeof p2pDispute {
    return p2pDispute.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        tradeId: {
          type: DataTypes.UUID,
          allowNull: false,
          validate: {
            notNull: { msg: "tradeId is required" },
            isUUID: { args: ANY_UUID_VERSION, msg: "tradeId must be a valid UUID" },
          },
        },
        amount: {
          type: DataTypes.STRING(50),
          allowNull: false,
          validate: { notEmpty: { msg: "amount must not be empty" } },
        },
        reportedById: {
          type: DataTypes.UUID,
          allowNull: false,
          validate: {
            notNull: { msg: "reportedById is required" },
            isUUID: { args: ANY_UUID_VERSION, msg: "reportedById must be a valid UUID" },
          },
        },
        againstId: {
          type: DataTypes.UUID,
          allowNull: false,
          validate: {
            notNull: { msg: "againstId is required" },
            isUUID: { args: ANY_UUID_VERSION, msg: "againstId must be a valid UUID" },
          },
        },
        reason: {
          type: DataTypes.TEXT,
          allowNull: false,
          validate: { notEmpty: { msg: "reason must not be empty" } },
        },
        details: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        filedOn: {
          type: DataTypes.DATE,
          allowNull: false,
          validate: {
            isDate: { args: true, msg: "filedOn must be a valid date" },
          },
        },
        status: {
          type: DataTypes.ENUM("PENDING", "IN_PROGRESS", "RESOLVED"),
          allowNull: false,
          defaultValue: "PENDING",
          validate: {
            isIn: {
              args: [["PENDING", "IN_PROGRESS", "RESOLVED"]],
              msg: "Invalid dispute status",
            },
          },
        },
        priority: {
          type: DataTypes.ENUM("HIGH", "MEDIUM", "LOW"),
          allowNull: false,
          validate: {
            isIn: {
              args: [["HIGH", "MEDIUM", "LOW"]],
              msg: "Invalid priority",
            },
          },
        },
        resolution: {
          type: DataTypes.JSON,
          allowNull: true,
          /*
           * Guarded AND DETACHED — see src/utils/json-column.ts.
           *
           * The guard normalises the engine difference (parsed on MySQL, a raw
           * STRING on MariaDB 10.4). The detachment is what keeps a
           * read-modify-write of this column working: a getter that returned the
           * array inside `dataValues` made `push` + `update()` a silent no-op on
           * every install with a real JSON column, which is how an operator's
           * message on a dispute could be accepted and never stored.
           */
          get(this: p2pDispute) {
            return readJsonObjectColumn(this.getDataValue("resolution"));
          },
        },
        resolvedOn: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        messages: {
          type: DataTypes.JSON,
          allowNull: true,
          /*
           * Guarded AND DETACHED — see src/utils/json-column.ts.
           *
           * The guard normalises the engine difference (parsed on MySQL, a raw
           * STRING on MariaDB 10.4). The detachment is what keeps a
           * read-modify-write of this column working: a getter that returned the
           * array inside `dataValues` made `push` + `update()` a silent no-op on
           * every install with a real JSON column, which is how an operator's
           * message on a dispute could be accepted and never stored.
           */
          get(this: p2pDispute) {
            return readJsonArrayColumn(this.getDataValue("messages"));
          },
        },
        evidence: {
          type: DataTypes.JSON,
          allowNull: true,
          /*
           * Guarded AND DETACHED — see src/utils/json-column.ts.
           *
           * The guard normalises the engine difference (parsed on MySQL, a raw
           * STRING on MariaDB 10.4). The detachment is what keeps a
           * read-modify-write of this column working: a getter that returned the
           * array inside `dataValues` made `push` + `update()` a silent no-op on
           * every install with a real JSON column, which is how an operator's
           * message on a dispute could be accepted and never stored.
           */
          get(this: p2pDispute) {
            return readJsonArrayColumn(this.getDataValue("evidence"));
          },
        },
        activityLog: {
          type: DataTypes.JSON,
          allowNull: true,
          /*
           * Guarded AND DETACHED — see src/utils/json-column.ts.
           *
           * The guard normalises the engine difference (parsed on MySQL, a raw
           * STRING on MariaDB 10.4). The detachment is what keeps a
           * read-modify-write of this column working: a getter that returned the
           * array inside `dataValues` made `push` + `update()` a silent no-op on
           * every install with a real JSON column, which is how an operator's
           * message on a dispute could be accepted and never stored.
           */
          get(this: p2pDispute) {
            return readJsonArrayColumn(this.getDataValue("activityLog"));
          },
        },
        appealedAt: {
          type: DataTypes.DATE,
          allowNull: true,
          comment:
            "When the trader this dispute was filed against formally contested it. Null means uncontested, which is not the same as agreed.",
        },
        appealedById: {
          type: DataTypes.UUID,
          allowNull: true,
          validate: {
            isUUID: { args: ANY_UUID_VERSION, msg: "appealedById must be a valid UUID" },
          },
          comment:
            "Who appealed. Always equal to againstId today; stored explicitly so the record does not depend on that staying true.",
        },
        appealStatement: {
          type: DataTypes.TEXT,
          allowNull: true,
          comment: "The respondent's account of what happened, in their own words.",
        },
      },
      {
        sequelize,
        modelName: "p2pDispute",
        tableName: "p2p_disputes",
        timestamps: true,
        paranoid: true,
        indexes: [
          {
            /* The operator's queue orders by "contested first". Without this
               that ordering is a filesort over every dispute ever filed. */
            name: "idx_p2p_dispute_status_appealedAt",
            using: "BTREE",
            fields: [{ name: "status" }, { name: "appealedAt" }],
          },
        ],
      }
    );
  }

  public static associate(models: any) {
    p2pDispute.belongsTo(models.p2pTrade, {
      as: "trade",
      foreignKey: "tradeId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    p2pDispute.belongsTo(models.user, {
      as: "reportedBy",
      foreignKey: "reportedById",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    p2pDispute.belongsTo(models.user, {
      as: "against",
      foreignKey: "againstId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    /* SET NULL, not CASCADE: a deleted account must not take the case it
       contested with it. The statement stays; only the attribution goes. */
    p2pDispute.belongsTo(models.user, {
      as: "appealedBy",
      foreignKey: "appealedById",
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    });
  }
}
