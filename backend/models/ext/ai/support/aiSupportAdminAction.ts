import type * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

/**
 * Something the admin assistant offered to do, and which administrator did it.
 *
 * ---------------------------------------------------------------------------
 * A SEPARATE TABLE FROM `ai_support_operation`, AND NOT FOR TIDINESS
 * ---------------------------------------------------------------------------
 * The customer-side table is keyed on a TICKET (`ticketId` is NOT NULL) and its
 * whole vocabulary is "whose account does this act on". An administrator running
 * a platform-wide action has no ticket and no subject account, so every row
 * would have had to carry a lie in a non-nullable column — and every reader of
 * that table (the case pane, the pending-step endpoint, the operator console's
 * operations list) would then have had to learn to skip rows that are not about
 * a customer at all.
 *
 * The two also answer different audit questions, and that is the real split.
 * There, the question is "prove no operation ran without the CUSTOMER asking for
 * it". Here it is "prove no action ran that an ADMINISTRATOR did not approve,
 * and name them" — which needs a field the other table has no use for.
 *
 * ---------------------------------------------------------------------------
 * `approvedBy` IS THE POINT OF THE WHOLE FEATURE
 * ---------------------------------------------------------------------------
 * The assistant proposes; it never executes. `approvedBy` is written from the
 * APPROVING request's own authenticated session — never from the proposal, never
 * from the body — so a COMPLETED row names the human being who is answerable for
 * it. That is what makes "recorded as the admin did it" a fact about the schema
 * rather than a claim in a comment.
 *
 * The invariant, checkable as a query and true forever:
 *
 *     state IN ('COMPLETED','FAILED') AND approvedBy IS NULL   -> zero rows
 *
 * ---------------------------------------------------------------------------
 * `permission` IS SNAPSHOTTED, DELIBERATELY
 * ---------------------------------------------------------------------------
 * The allowlist entry carries the admin permission key its own screen is gated
 * on, and that key is copied onto the row at proposal time. It is re-derived
 * from the live catalogue and re-checked at approval — the snapshot is NOT the
 * thing enforced, because a stale copy would be a way to run an action under a
 * permission it no longer requires.
 *
 * It is stored so the audit trail can answer "under what authority did this
 * run" months later, when the catalogue entry may have been re-gated or removed
 * entirely. An audit row that cannot say what it required is an audit row that
 * has to be trusted rather than read.
 */
export default class aiSupportAdminAction
  extends Model<
    aiSupportAdminActionAttributes,
    aiSupportAdminActionCreationAttributes
  >
  implements aiSupportAdminActionAttributes
{
  id!: string;
  /**
   * The administrator the assistant offered this to.
   *
   * From the asking request's session. It is NOT the authority for running the
   * action — see `approvedBy`, which is written independently from the approving
   * request. The two are almost always the same person and the schema does not
   * assume it, because "proposed to A, approved by B" is a thing an audit trail
   * has to be able to represent rather than collapse.
   */
  proposedTo!: string;
  /** A key from the allowlist in `utils/admin-operations.ts`. Never free text. */
  action!: string;
  /** The admin permission key this required, as it stood when proposed. */
  permission!: string;
  /**
   * Why the assistant offered it, in its own words.
   *
   * The ONLY model-authored field on this row, and deliberately not what the
   * administrator is asked to approve — the sentence they read is a constant
   * belonging to the action. This is here for whoever reads the trail later.
   */
  reason?: string;
  state!: "PROPOSED" | "CONFIRMED" | "COMPLETED" | "FAILED" | "EXPIRED";
  /**
   * A correlation id shared by every step of one procedure. Null when standalone.
   *
   * NOT a foreign key. The customer side has an `aiSupportWorkflow` row holding
   * a process's own state because a process there has three writers — the
   * customer, an operator cancelling from the console, and an hourly expiry
   * sweep — and they need somewhere to agree. An admin procedure has one writer
   * in one console, and its state is entirely derivable from its step rows, so a
   * second table would be a second state to fall out of step with the first.
   */
  workflowId?: string;
  /**
   * The procedure's catalogue key, when this row is a step of one.
   *
   * On the row because it cannot be recovered from `action`. A `navigate` step's
   * key is namespaced (`set_up_deposits:gateways`) and could be split, but an
   * `action` step's key is the bare allowlist key — `rebuild_knowledge_index`
   * says nothing about which procedure it belongs to. Deriving the procedure by
   * searching every catalogue entry for a matching step would find the wrong one
   * the moment two procedures share an action, which two of them already do.
   */
  procedure?: string;
  /** 0-based position within the procedure's step list. Null when standalone. */
  stepIndex?: number;
  /**
   * WHO APPROVED IT. Written from the approving request's own session.
   *
   * Null on anything that never ran. Non-null on everything that did — that pair
   * of facts is the audit claim, and it is enforced by there being no code path
   * that runs a step without first writing this.
   */
  approvedBy?: string;
  approvedAt?: Date;
  completedAt?: Date;
  /** What the administrator was shown afterwards, success or failure. */
  result?: string;

  createdAt!: Date;
  updatedAt!: Date;

  public static initModel(
    sequelize: Sequelize.Sequelize
  ): typeof aiSupportAdminAction {
    return aiSupportAdminAction.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        proposedTo: { type: DataTypes.UUID, allowNull: false },
        action: { type: DataTypes.STRING(64), allowNull: false },
        permission: { type: DataTypes.STRING(64), allowNull: false },
        reason: { type: DataTypes.TEXT, allowNull: true },
        workflowId: { type: DataTypes.UUID, allowNull: true },
        procedure: { type: DataTypes.STRING(64), allowNull: true },
        stepIndex: { type: DataTypes.INTEGER, allowNull: true },
        state: {
          type: DataTypes.ENUM(
            "PROPOSED",
            "CONFIRMED",
            "COMPLETED",
            "FAILED",
            "EXPIRED"
          ),
          allowNull: false,
          defaultValue: "PROPOSED",
        },
        approvedBy: { type: DataTypes.UUID, allowNull: true },
        approvedAt: { type: DataTypes.DATE, allowNull: true },
        completedAt: { type: DataTypes.DATE, allowNull: true },
        result: { type: DataTypes.TEXT, allowNull: true },
      },
      {
        sequelize,
        modelName: "aiSupportAdminAction",
        tableName: "ai_support_admin_action",
        paranoid: false,
        timestamps: true,
        indexes: [
          { name: "PRIMARY", unique: true, fields: [{ name: "id" }] },
          {
            // "What is waiting for THIS administrator's approval?" — the rail's
            // only query, on every admin page load.
            name: "ai_support_admin_action_pending_idx",
            using: "BTREE",
            fields: [{ name: "proposedTo" }, { name: "state" }],
          },
          {
            // "What has this administrator actually run?" — the audit read.
            name: "ai_support_admin_action_approved_idx",
            using: "BTREE",
            fields: [{ name: "approvedBy" }, { name: "completedAt" }],
          },
          {
            name: "ai_support_admin_action_workflow_idx",
            using: "BTREE",
            fields: [{ name: "workflowId" }, { name: "stepIndex" }],
          },
        ],
      }
    );
  }
}
