import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";
import { ANY_UUID_VERSION } from "@b/utils/model-validators";

/**
 * "REPORT USER" — a complaint about a PERSON, not about a trade.
 *
 * WHY IT IS NOT A DISPUTE
 * -----------------------
 * `p2pDispute` already exists and answers a different question: it is attached
 * to one trade, it freezes that trade's escrow, and its outcome is a decision
 * about where money goes. Most of what people actually need to report has no
 * money in it at all — a trader demanding payment to a third-party account, an
 * advert with a phone number in the terms, abuse in the chat, an account that
 * looks like a duplicate of one that was banned. Filing those as disputes
 * would freeze an escrow to complain about a message, and filing them nowhere
 * is what a platform does when it has no door for them.
 *
 * SO IT IS ITS OWN RECORD, AND IT IS ABOUT A PERSON. `tradeId` is optional
 * because most reports have one and some do not.
 *
 * PARANOID, unlike `p2pTraderRelation`. A report is an allegation about
 * somebody and the platform's own handling of it is the thing an operator may
 * later have to account for, so a deleted one stays recoverable. There is no
 * unique index here for exactly that reason — see the note on the relation
 * model about what a UNIQUE column does to a soft-deleted row.
 */
export default class p2pUserReport
  extends Model<p2pUserReportAttributes, p2pUserReportCreationAttributes>
  implements p2pUserReportAttributes
{
  id!: string;
  reporterId!: string;
  reportedId!: string;
  /** The trade it happened on, when there was one. */
  tradeId?: string;
  reason!:
    | "PAYMENT_OUTSIDE_PLATFORM"
    | "THIRD_PARTY_PAYMENT"
    | "ABUSIVE_CONDUCT"
    | "CONTACT_DETAILS_IN_ADVERT"
    | "SUSPECTED_FRAUD"
    | "IMPERSONATION"
    | "OTHER";
  details!: string;
  status!: "PENDING" | "REVIEWING" | "ACTIONED" | "DISMISSED";
  /** What the desk decided, and why. Written only by an operator. */
  resolution?: string;
  reviewedById?: string;
  reviewedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;

  public static initModel(sequelize: Sequelize.Sequelize): typeof p2pUserReport {
    return p2pUserReport.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        reporterId: {
          type: DataTypes.UUID,
          allowNull: false,
          validate: {
            notNull: { msg: "reporterId cannot be null" },
            isUUID: { args: ANY_UUID_VERSION, msg: "reporterId must be a valid UUID" },
          },
        },
        reportedId: {
          type: DataTypes.UUID,
          allowNull: false,
          validate: {
            notNull: { msg: "reportedId cannot be null" },
            isUUID: { args: ANY_UUID_VERSION, msg: "reportedId must be a valid UUID" },
          },
        },
        tradeId: {
          type: DataTypes.UUID,
          allowNull: true,
          validate: {
            isUUID: { args: ANY_UUID_VERSION, msg: "tradeId must be a valid UUID" },
          },
        },
        reason: {
          /* ORDER IS LOAD-BEARING. MySQL can only widen an ENUM by APPENDING,
             so a new reason goes on the END of this list and nowhere else. */
          type: DataTypes.ENUM(
            "PAYMENT_OUTSIDE_PLATFORM",
            "THIRD_PARTY_PAYMENT",
            "ABUSIVE_CONDUCT",
            "CONTACT_DETAILS_IN_ADVERT",
            "SUSPECTED_FRAUD",
            "IMPERSONATION",
            "OTHER"
          ),
          allowNull: false,
        },
        details: {
          type: DataTypes.TEXT,
          allowNull: false,
          validate: {
            notEmpty: { msg: "A report must say what happened" },
          },
        },
        status: {
          type: DataTypes.ENUM("PENDING", "REVIEWING", "ACTIONED", "DISMISSED"),
          allowNull: false,
          defaultValue: "PENDING",
        },
        resolution: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        reviewedById: {
          type: DataTypes.UUID,
          allowNull: true,
          validate: {
            isUUID: { args: ANY_UUID_VERSION, msg: "reviewedById must be a valid UUID" },
          },
        },
        reviewedAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
      },
      {
        sequelize,
        modelName: "p2pUserReport",
        tableName: "p2p_user_reports",
        timestamps: true,
        paranoid: true,
        indexes: [
          {
            // The operator's queue: open reports, oldest first.
            name: "idx_p2p_report_status_createdAt",
            using: "BTREE",
            fields: [{ name: "status" }, { name: "createdAt" }],
          },
          {
            // "What has been said about this person" — the question that turns
            // five separate complaints into one pattern.
            name: "idx_p2p_report_reportedId",
            using: "BTREE",
            fields: [{ name: "reportedId" }],
          },
          {
            // Rate limiting reads this: how many has this reporter filed today.
            name: "idx_p2p_report_reporterId_createdAt",
            using: "BTREE",
            fields: [{ name: "reporterId" }, { name: "createdAt" }],
          },
        ],
      }
    );
  }

  public static associate(models: any) {
    p2pUserReport.belongsTo(models.user, {
      as: "reporter",
      foreignKey: "reporterId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    p2pUserReport.belongsTo(models.user, {
      as: "reported",
      foreignKey: "reportedId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    p2pUserReport.belongsTo(models.p2pTrade, {
      as: "trade",
      foreignKey: "tradeId",
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    });
    p2pUserReport.belongsTo(models.user, {
      as: "reviewedBy",
      foreignKey: "reviewedById",
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    });
  }
}
