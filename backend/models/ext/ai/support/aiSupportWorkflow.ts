import type * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

/**
 * A process the assistant started, and how far through it the customer is.
 *
 * ---------------------------------------------------------------------------
 * THE MODEL STARTS IT AND THEN HAS NO FURTHER PART IN IT
 * ---------------------------------------------------------------------------
 * `aiSupportOperation` already gave a complete confirm-then-act loop, and it is
 * flat: one row is one offer. A three-confirmation process was three unrelated
 * rows, and the model had to remember to re-propose each one — which it will not
 * do reliably across a page reload, let alone across three days.
 *
 * This row is the memory. It carries the workflow key and the step the customer
 * has reached, and ADVANCEMENT IS SERVER-SIDE: when a step completes, the
 * confirm route writes the next step's PROPOSED operation row itself. The model
 * is not consulted, does not see it, and cannot influence it.
 *
 * So the worst a prompt injection can achieve is starting an allowlisted
 * workflow the customer then declines — the same ceiling `propose_operation`
 * already had, extended over a sequence rather than raised.
 *
 * ---------------------------------------------------------------------------
 * THE STEPS ARE CODE, NOT MODEL OUTPUT
 * ---------------------------------------------------------------------------
 * `workflow` is a key from the allowlist in `utils/workflows.ts` and the step
 * list belongs to that definition. Nothing about the sequence is stored here,
 * because a stored sequence would be a sequence something could have written.
 *
 * The alternative — letting the model plan the steps at runtime — is more
 * flexible and wrong twice over: an injection could author a CHAIN of
 * authenticated writes rather than pick one from a list, and a customer cannot
 * give informed consent to step 3 while step 3 is still being written.
 *
 * ---------------------------------------------------------------------------
 * WHAT THE AUDIT TRAIL STILL SAYS
 * ---------------------------------------------------------------------------
 * Every step is an ordinary `aiSupportOperation` row confirmed through the
 * existing route, so the claim that table exists to support holds unchanged, for
 * every step, with no new code to trust:
 *
 *     SELECT COUNT(*) FROM ai_support_operation
 *      WHERE state IN ('COMPLETED','FAILED') AND confirmedAt IS NULL   -- 0
 */
export default class aiSupportWorkflow
  extends Model<
    aiSupportWorkflowAttributes,
    aiSupportWorkflowCreationAttributes
  >
  implements aiSupportWorkflowAttributes
{
  id!: string;
  /** Whose account it acts on. From the session, at every step. */
  userId!: string;
  ticketId!: string;
  /** A key from the allowlist in `utils/workflows.ts`. Never free text. */
  workflow!: string;
  /**
   * Why the assistant started it, in its own words.
   *
   * The only model-authored field on the row, and — as on `aiSupportOperation` —
   * deliberately not what the customer is asked to consent to. Each step's
   * description is a constant belonging to the step. This is for the operator
   * reading the trail afterwards.
   */
  reason?: string;
  /**
   * How many steps are DONE. `0` means the first step is outstanding.
   *
   * A count rather than a pointer, so "finished" is `currentStep === steps.length`
   * and there is no off-by-one to get wrong at the boundary.
   */
  currentStep!: number;
  state!: "RUNNING" | "COMPLETED" | "CANCELLED" | "EXPIRED" | "FAILED";
  /** Who ended it, when a person did. An operator id, or null. */
  cancelledBy?: string;
  completedAt?: Date;
  /** What the customer was last shown. Success or the reason it stopped. */
  result?: string;

  createdAt!: Date;
  updatedAt!: Date;

  public static initModel(
    sequelize: Sequelize.Sequelize
  ): typeof aiSupportWorkflow {
    return aiSupportWorkflow.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        userId: { type: DataTypes.UUID, allowNull: false },
        ticketId: { type: DataTypes.UUID, allowNull: false },
        workflow: { type: DataTypes.STRING(64), allowNull: false },
        reason: { type: DataTypes.TEXT, allowNull: true },
        currentStep: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        state: {
          type: DataTypes.ENUM(
            "RUNNING",
            "COMPLETED",
            "CANCELLED",
            "EXPIRED",
            "FAILED"
          ),
          allowNull: false,
          defaultValue: "RUNNING",
        },
        cancelledBy: { type: DataTypes.UUID, allowNull: true },
        completedAt: { type: DataTypes.DATE, allowNull: true },
        result: { type: DataTypes.TEXT, allowNull: true },
      },
      {
        sequelize,
        modelName: "aiSupportWorkflow",
        tableName: "ai_support_workflow",
        paranoid: false,
        timestamps: true,
        indexes: [
          { name: "PRIMARY", unique: true, fields: [{ name: "id" }] },
          {
            // The resume lookup: "is there a live process on this ticket?" runs
            // on every turn and on the auto-close sweep.
            name: "ai_support_workflow_ticket_state_idx",
            using: "BTREE",
            fields: [{ name: "ticketId" }, { name: "state" }],
          },
          {
            name: "ai_support_workflow_user_state_idx",
            using: "BTREE",
            fields: [{ name: "userId" }, { name: "state" }],
          },
        ],
      }
    );
  }
}
