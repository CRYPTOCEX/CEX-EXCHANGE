import type * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

/**
 * One conversation between an administrator and their own assistant.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS IS NOT `ai_support_session`
 * ---------------------------------------------------------------------------
 * That table is keyed on a TICKET — `ticketId` is NOT NULL, and so is
 * `aiSupportTurn.ticketId` — and its whole vocabulary is a customer
 * conversation: `channel` is TICKET or LIVE, `state` runs through escalation and
 * handover, `deflected` counts a ticket that was never opened. An administrator
 * asking how to configure deposits has none of that, so every row would have to
 * carry a fabricated ticket id in a non-nullable column.
 *
 * The stronger reason is what reads that table. The Overview figures, the
 * coverage report, the escalation report and the deflection rate all count rows
 * in it as CUSTOMER conversations. Filing admin questions there would inflate
 * every one of those silently — an operator would see their assistant handling
 * more tickets than exist.
 *
 * ---------------------------------------------------------------------------
 * IT IS OWNED, AND THAT IS A SECURITY PROPERTY RATHER THAN A CONVENIENCE
 * ---------------------------------------------------------------------------
 * Every catalogue behind the admin assistant is filtered by the ASKING
 * administrator's own permissions: the screens it named, the queues it counted,
 * the actions it offered. A stored answer is therefore a record of what ONE
 * person was allowed to see.
 *
 * So a second administrator reading somebody else's session is a permission
 * leak, and not a subtle one — a junior with three grants could read the
 * withdrawal queue depth out of the Super Admin's transcript. Every query in
 * every route scopes on `adminId` IN THE WHERE CLAUSE, never "find by id and
 * then check the owner".
 */
export default class aiSupportAdminSession
  extends Model<
    aiSupportAdminSessionAttributes,
    aiSupportAdminSessionCreationAttributes
  >
  implements aiSupportAdminSessionAttributes
{
  id!: string;
  /** The administrator this conversation belongs to. The ONLY reader of it. */
  adminId!: string;
  /**
   * What the conversation is about, for the history list.
   *
   * Taken from the first question, truncated. NOT model-generated: titling a
   * thread would be a second billed call per conversation to produce a label,
   * and the first question is what somebody scanning their own history actually
   * recognises.
   */
  title!: string;
  /**
   * The admin screen the conversation was opened from, when it was opened from
   * one. Context for the reader scanning a list a week later — "the one I
   * started on the withdrawal queue".
   */
  screen?: string;
  turnCount!: number;
  /**
   * Running total of what this conversation has cost.
   *
   * Denormalised deliberately. The history list shows it per row, and summing
   * the turns for every row of a list is the query that makes a history screen
   * slow enough that people stop opening it.
   */
  costUsdTotal!: number;
  /** Ordering key for the list. Updated on every turn. */
  lastMessageAt!: Date;

  createdAt!: Date;
  updatedAt!: Date;

  public static initModel(
    sequelize: Sequelize.Sequelize
  ): typeof aiSupportAdminSession {
    return aiSupportAdminSession.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        adminId: { type: DataTypes.UUID, allowNull: false },
        title: { type: DataTypes.STRING(160), allowNull: false },
        screen: { type: DataTypes.STRING(191), allowNull: true },
        turnCount: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        costUsdTotal: {
          /*
           * DECIMAL, like every other money column here — and mysql2 hands
           * DECIMAL back as a STRING, so every reader has to Number() it. The
           * customer session's `costUsdTotal` is the same shape for the same
           * reason.
           */
          type: DataTypes.DECIMAL(12, 6),
          allowNull: false,
          defaultValue: 0,
        },
        lastMessageAt: { type: DataTypes.DATE, allowNull: false },
      },
      {
        sequelize,
        modelName: "aiSupportAdminSession",
        tableName: "ai_support_admin_session",
        paranoid: false,
        timestamps: true,
        indexes: [
          { name: "PRIMARY", unique: true, fields: [{ name: "id" }] },
          {
            // "My conversations, newest first" — the history list's only query,
            // and the ONLY way this table is ever read.
            name: "ai_support_admin_session_owner_idx",
            using: "BTREE",
            fields: [{ name: "adminId" }, { name: "lastMessageAt" }],
          },
          {
            // The retention sweep. Without it the purge is a full scan on a
            // table that only ever grows.
            name: "ai_support_admin_session_age_idx",
            using: "BTREE",
            fields: [{ name: "lastMessageAt" }],
          },
        ],
      }
    );
  }
}
