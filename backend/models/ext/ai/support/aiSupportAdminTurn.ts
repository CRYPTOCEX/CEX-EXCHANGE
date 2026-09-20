import type * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

/**
 * One question and its answer, kept because the answer was PAID FOR.
 *
 * ---------------------------------------------------------------------------
 * THE ADMIN ASSISTANT WAS SPENDING MONEY AND RECORDING NOTHING
 * ---------------------------------------------------------------------------
 * `aiSupportTurn` rows are created in exactly two places — `engine.ts`, when the
 * assistant answers a customer, and `proactive.ts`. The admin console, the
 * handbook and the ask-about-a-customer route created none.
 *
 * Two consequences, and both were invisible:
 *
 *   THE ANSWER WAS THROWN AWAY. It lived in React state until the next question
 *   cleared it, or the administrator navigated, or the panel closed. A
 *   twenty-second answer about why a withdrawal was stuck cost real money and
 *   survived until somebody clicked something.
 *
 *   THE SPEND WAS INVISIBLE. `getBudgetStatus()` sums `ai_support_turn.costUsd`
 *   and nothing else. So every admin question CHECKED a budget it never
 *   CONTRIBUTED to — an operator could exhaust their allowance on their own
 *   questions while the budget screen read zero, and the console route's own
 *   header claimed the opposite.
 *
 * This table fixes both, and the budget reader sums it alongside the customer
 * one — see `sumCostSince`.
 *
 * ---------------------------------------------------------------------------
 * WHY NOT `ai_support_turn`
 * ---------------------------------------------------------------------------
 * `sessionId` and `ticketId` are both NOT NULL there and both mean a customer
 * ticket. More importantly, the Overview figures, the coverage report and the
 * deflection rate all read that table as a count of CUSTOMER conversations —
 * filing admin questions there would inflate every one of them silently.
 *
 * ---------------------------------------------------------------------------
 * `adminId` IS DENORMALISED ONTO THE TURN, DELIBERATELY
 * ---------------------------------------------------------------------------
 * It is on the session already. It is here too so that the owner scope is a
 * clause on the turn's OWN query rather than a join — the discipline this
 * feature depends on is that no route ever loads a row it has not already
 * proven belongs to the caller, and a join is one refactor away from becoming a
 * post-hoc check.
 */
export default class aiSupportAdminTurn
  extends Model<
    aiSupportAdminTurnAttributes,
    aiSupportAdminTurnCreationAttributes
  >
  implements aiSupportAdminTurnAttributes
{
  id!: string;
  sessionId!: string;
  /** The owner. Denormalised so an owner-scoped read needs no join. */
  adminId!: string;
  /** What they asked, verbatim. */
  question!: string;
  /** What they were told. The thing that was paid for. */
  answer!: string;
  /** Whether documentation backed it, or it was a refusal. */
  grounded!: boolean;
  /** `[{title,url}]` — the passages the answer was checked against. */
  sources?: unknown[];
  /**
   * The proposals this turn produced, as they were rendered.
   *
   * Stored so a reopened conversation reads the way it did. The buttons are NOT
   * re-armed from this: a proposal's live state is a row in
   * `ai_support_admin_action`, and an approval control rebuilt from a transcript
   * would be a control whose backing row may have expired, been withdrawn, or
   * already run.
   */
  proposals?: Record<string, unknown>;
  /** Which admin screen they were standing on. */
  screen?: string;

  providerId?: string;
  /** The TIER, never a vendor model id. */
  model?: string;
  inputTokens!: number;
  outputTokens!: number;
  cacheReadTokens!: number;
  cacheWriteTokens!: number;
  /** What this turn cost. Summed by the budget reader. */
  costUsd!: number;
  latencyMs?: number;

  createdAt!: Date;
  updatedAt!: Date;

  public static initModel(
    sequelize: Sequelize.Sequelize
  ): typeof aiSupportAdminTurn {
    return aiSupportAdminTurn.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        sessionId: { type: DataTypes.UUID, allowNull: false },
        adminId: { type: DataTypes.UUID, allowNull: false },
        question: { type: DataTypes.TEXT, allowNull: false },
        answer: { type: DataTypes.TEXT("long"), allowNull: false },
        grounded: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        sources: {
          type: DataTypes.JSON,
         allowNull: true,
          get(this: any) {
            /*
             * Guarded both ways: `typeof` stops an already-parsed value (prod
             * MySQL) being parsed a second time, and the try/catch stops a
             * corrupt value throwing inside a getter during an ordinary read.
             */
            const value = this.getDataValue("sources") as unknown;
            if (value == null) return [];
            if (typeof value === "string") {
              try {
                return JSON.parse(value);
              } catch {
                return [];
              }
            }
            return value;
          },
        },
        proposals: {
          type: DataTypes.JSON,
         allowNull: true,
          get(this: any) {
            /*
             * Guarded both ways: `typeof` stops an already-parsed value (prod
             * MySQL) being parsed a second time, and the try/catch stops a
             * corrupt value throwing inside a getter during an ordinary read.
             */
            const value = this.getDataValue("proposals") as unknown;
            if (value == null) return [];
            if (typeof value === "string") {
              try {
                return JSON.parse(value);
              } catch {
                return [];
              }
            }
            return value;
          },
        },
        screen: { type: DataTypes.STRING(191), allowNull: true },
        providerId: { type: DataTypes.STRING(32), allowNull: true },
        model: { type: DataTypes.STRING(64), allowNull: true },
        inputTokens: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        outputTokens: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        cacheReadTokens: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        cacheWriteTokens: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        costUsd: {
          type: DataTypes.DECIMAL(12, 6),
          allowNull: false,
          defaultValue: 0,
        },
        latencyMs: { type: DataTypes.INTEGER, allowNull: true },
      },
      {
        sequelize,
        modelName: "aiSupportAdminTurn",
        tableName: "ai_support_admin_turn",
        paranoid: false,
        timestamps: true,
        indexes: [
          { name: "PRIMARY", unique: true, fields: [{ name: "id" }] },
          {
            // Reading one conversation back, in order.
            name: "ai_support_admin_turn_session_idx",
            using: "BTREE",
            fields: [{ name: "sessionId" }, { name: "createdAt" }],
          },
          {
            /*
             * THE BUDGET SUM, which runs on every model call in the product —
             * customer and admin alike. Without this index that read degrades
             * to a full scan of a table that only grows, on the hot path of
             * every answer.
             */
            name: "ai_support_admin_turn_cost_idx",
            using: "BTREE",
            fields: [{ name: "createdAt" }, { name: "costUsd" }],
          },
        ],
      }
    );
  }
}
