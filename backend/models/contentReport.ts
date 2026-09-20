import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";
import { ANY_UUID_VERSION } from "@b/utils/model-validators";

/**
 * "REPORT THIS" — for content that is not a person and not a trade.
 *
 * ---------------------------------------------------------------------------
 * WHY A SECOND REPORT MODEL
 * ---------------------------------------------------------------------------
 * `p2pUserReport` already exists and is deliberately P2P-shaped: `reportedId`
 * is a user with a foreign key, `tradeId` is a trade, and the admin queue built
 * on it lays itself out around reporter-and-reported PEOPLE. That is the right
 * shape for "this trader demanded payment off-platform" and the wrong shape for
 * "this comment is abuse" — a comment has an author, but the thing being
 * reported is the text, and an operator acting on it deletes the comment rather
 * than sanctioning the person.
 *
 * Widening `p2pUserReport` with a nullable `targetType`/`targetId` would have
 * made every column on it optional and left the P2P queue guessing which of its
 * own fields were populated. So: a second, genuinely generic record.
 *
 * ---------------------------------------------------------------------------
 * WHY IT EXISTS AT ALL
 * ---------------------------------------------------------------------------
 * Google Play's user-generated content policy and Apple 1.2 both require an
 * in-app way to report objectionable content, on every surface that carries it.
 * Blog comments are postable AND readable from the mobile app and had no report
 * path of any kind — the comment card carried a `// No like/report buttons`
 * note where the control should have been.
 *
 * ---------------------------------------------------------------------------
 * TARGETID HAS NO FOREIGN KEY, ON PURPOSE
 * ---------------------------------------------------------------------------
 * It is polymorphic: the row it names lives in a different table depending on
 * `targetType`, and MySQL cannot express that as a constraint. Two consequences
 * worth stating rather than discovering:
 *
 *   - Deleting the reported content does NOT cascade this row away, which is
 *     what you want. The report is the record of somebody having complained and
 *     of the platform having acted; it has to outlive the thing it is about, or
 *     acting on a report destroys the evidence that it was acted on.
 *   - A reader must therefore tolerate a `targetId` whose row is gone. The
 *     admin queue treats that as "already removed", not as an error.
 */
export default class contentReport
  extends Model<contentReportAttributes, contentReportCreationAttributes>
  implements contentReportAttributes
{
  id!: string;
  reporterId!: string;
  /** Which kind of thing is being reported. Decides where `targetId` points. */
  targetType!:
    | "BLOG_COMMENT"
    | "BLOG_POST"
    | "NFT_LISTING"
    | "USER_PROFILE"
    | "SUPPORT_TICKET";
  /** The reported row's id, in whichever table `targetType` names. */
  targetId!: string;
  /**
   * Who authored the reported content, when it is known.
   *
   * Nullable and NOT the subject of the report — it is here so an operator can
   * see five complaints about five different comments by one person as one
   * pattern, which is the question a per-item queue otherwise cannot answer.
   */
  targetOwnerId?: string | null;
  reason!:
    | "SPAM"
    | "ABUSIVE_CONDUCT"
    | "HATE_SPEECH"
    | "SEXUAL_CONTENT"
    | "VIOLENCE"
    | "SCAM_OR_FRAUD"
    | "IMPERSONATION"
    | "OTHER";
  details!: string;
  status!: "PENDING" | "REVIEWING" | "ACTIONED" | "DISMISSED";
  /** What the operator did, in their own words. */
  resolution?: string | null;
  reviewedById?: string | null;
  reviewedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;

  public static initModel(
    sequelize: Sequelize.Sequelize
  ): typeof contentReport {
    return contentReport.init(
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
            isUUID: {
              args: ANY_UUID_VERSION,
              msg: "reporterId must be a valid UUID",
            },
          },
        },
        targetType: {
          /* ORDER IS LOAD-BEARING. MySQL can only widen an ENUM by APPENDING,
             so a new target kind goes on the END of this list and nowhere
             else. */
          type: DataTypes.ENUM(
            "BLOG_COMMENT",
            "BLOG_POST",
            "NFT_LISTING",
            "USER_PROFILE",
            "SUPPORT_TICKET"
          ),
          allowNull: false,
        },
        targetId: {
          // No `references`: see the note at the top. The table this points at
          // is decided by `targetType`, which a foreign key cannot express.
          type: DataTypes.UUID,
          allowNull: false,
          validate: {
            notNull: { msg: "targetId cannot be null" },
            isUUID: {
              args: ANY_UUID_VERSION,
              msg: "targetId must be a valid UUID",
            },
          },
        },
        targetOwnerId: {
          type: DataTypes.UUID,
          allowNull: true,
          validate: {
            isUUID: {
              args: ANY_UUID_VERSION,
              msg: "targetOwnerId must be a valid UUID",
            },
          },
        },
        reason: {
          // Same appending rule as targetType.
          type: DataTypes.ENUM(
            "SPAM",
            "ABUSIVE_CONDUCT",
            "HATE_SPEECH",
            "SEXUAL_CONTENT",
            "VIOLENCE",
            "SCAM_OR_FRAUD",
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
          type: DataTypes.ENUM(
            "PENDING",
            "REVIEWING",
            "ACTIONED",
            "DISMISSED"
          ),
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
            isUUID: {
              args: ANY_UUID_VERSION,
              msg: "reviewedById must be a valid UUID",
            },
          },
        },
        reviewedAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
      },
      {
        sequelize,
        modelName: "contentReport",
        tableName: "content_reports",
        timestamps: true,
        // PARANOID, for the same reason p2pUserReport is: a report is an
        // allegation, and how the operator handled it is the thing they may
        // later have to account for. No unique index anywhere here — a UNIQUE
        // column on a paranoid model keeps the deleted row's value and makes
        // the same report impossible to file twice, forever.
        paranoid: true,
        indexes: [
          {
            // The queue: open reports, oldest first.
            name: "idx_content_report_status_createdAt",
            using: "BTREE",
            fields: [{ name: "status" }, { name: "createdAt" }],
          },
          {
            // "Has this item been reported before?" — and the duplicate check
            // the POST route runs before accepting another one.
            name: "idx_content_report_target",
            using: "BTREE",
            fields: [{ name: "targetType" }, { name: "targetId" }],
          },
          {
            // Rate limiting: how many has this reporter filed today.
            name: "idx_content_report_reporterId_createdAt",
            using: "BTREE",
            fields: [{ name: "reporterId" }, { name: "createdAt" }],
          },
        ],
      }
    );
  }

  public static associate(models: any) {
    contentReport.belongsTo(models.user, {
      as: "reporter",
      foreignKey: "reporterId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    // `targetOwner` is a real FK because it names a user row; `targetId` is not,
    // because it does not name a fixed table.
    contentReport.belongsTo(models.user, {
      as: "targetOwner",
      foreignKey: "targetOwnerId",
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    });
    contentReport.belongsTo(models.user, {
      as: "reviewedBy",
      foreignKey: "reviewedById",
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    });
  }
}
