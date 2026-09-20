import type * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

/**
 * Something the assistant offered to do, and what came of it.
 *
 * ---------------------------------------------------------------------------
 * THE ROW EXISTS BEFORE THE ACTION DOES, AND THAT IS THE POINT
 * ---------------------------------------------------------------------------
 * The model creates this in state PROPOSED and can do nothing else with it. The
 * customer's own authenticated click moves it to CONFIRMED, and only then does
 * anything run.
 *
 * So the table is not merely analytics — it is the mechanism. An execution
 * without a prior confirmation is impossible to express: there is no code path
 * that runs an operation without first reading a PROPOSED row and writing
 * CONFIRMED to it, and the transition is guarded by the row's own state.
 *
 * It is also the evidence. "Prove no operation ran without the customer asking
 * for it" is answerable as a query — `state = 'COMPLETED' AND confirmedAt IS
 * NULL` must return zero rows, forever — rather than as an argument about code.
 */
export default class aiSupportOperation
  extends Model<
    aiSupportOperationAttributes,
    aiSupportOperationCreationAttributes
  >
  implements aiSupportOperationAttributes
{
  id!: string;
  /** Whose account it acts on. From the session at proposal AND at execution. */
  userId!: string;
  ticketId!: string;
  /** A key from the allowlist in `utils/operations.ts`. Never free text. */
  operation!: string;
  /**
   * Why the assistant offered it, in its own words.
   *
   * The only model-authored field on the row, and it is deliberately not what
   * the customer is asked to consent to — the description they read is a
   * constant belonging to the operation. This is here for the operator reading
   * the audit trail afterwards.
   */
  reason?: string;
  state!: "PROPOSED" | "CONFIRMED" | "COMPLETED" | "FAILED" | "EXPIRED";
  /**
   * The process this row is one step of, when it is one.
   *
   * Null for a standalone offer, which is what every row was before workflows
   * existed and what most rows still are. A workflow is a SEQUENCE OVER THIS
   * TABLE rather than a second execution path: each step is an ordinary row
   * confirmed through the same route, so the audit claim in the header holds for
   * every step with no new code to trust.
   */
  workflowId?: string;
  /** 0-based position within the workflow's step list. Null when standalone. */
  stepIndex?: number;
  /** When the CUSTOMER pressed the button. Null on anything that never ran. */
  confirmedAt?: Date;
  completedAt?: Date;
  /** What the customer was shown afterwards, success or failure. */
  result?: string;

  createdAt!: Date;
  updatedAt!: Date;

  public static initModel(
    sequelize: Sequelize.Sequelize
  ): typeof aiSupportOperation {
    return aiSupportOperation.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        userId: { type: DataTypes.UUID, allowNull: false },
        ticketId: { type: DataTypes.UUID, allowNull: false },
        operation: { type: DataTypes.STRING(64), allowNull: false },
        reason: { type: DataTypes.TEXT, allowNull: true },
        workflowId: { type: DataTypes.UUID, allowNull: true },
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
        confirmedAt: { type: DataTypes.DATE, allowNull: true },
        completedAt: { type: DataTypes.DATE, allowNull: true },
        result: { type: DataTypes.TEXT, allowNull: true },
      },
      {
        sequelize,
        modelName: "aiSupportOperation",
        tableName: "ai_support_operation",
        paranoid: false,
        timestamps: true,
        indexes: [
          { name: "PRIMARY", unique: true, fields: [{ name: "id" }] },
          {
            name: "ai_support_operation_user_state_idx",
            using: "BTREE",
            fields: [{ name: "userId" }, { name: "state" }],
          },
          {
            name: "ai_support_operation_ticket_idx",
            using: "BTREE",
            fields: [{ name: "ticketId" }],
          },
          {
            // "What is outstanding on this process?" — read by the confirm route
            // when it advances, and by the case pane so an operator taking over
            // can see a half-finished process rather than discover it.
            name: "ai_support_operation_workflow_idx",
            using: "BTREE",
            fields: [{ name: "workflowId" }, { name: "stepIndex" }],
          },
        ],
      }
    );
  }
}
