import type * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

/**
 * One attempted AI answer.
 *
 * This single table is the cost ledger, the audit trail, the gap report input
 * and the evaluation baseline. Every generation writes a row — including the
 * ones that never produced text (SKIPPED, REFUSED, FAILED), because "why did the
 * agent stay silent" is the question operators actually ask.
 */
export default class aiSupportTurn
  extends Model<aiSupportTurnAttributes, aiSupportTurnCreationAttributes>
  implements aiSupportTurnAttributes
{
  id!: string;
  sessionId!: string;
  ticketId!: string;
  /** Stable `key` of the message this turn produced. Never an array index. */
  messageKey?: string;
  trigger!: "NEW_TICKET" | "CUSTOMER_REPLY" | "MANUAL" | "RETRY" | "HANDBACK";
  providerId!: string;
  model?: string;
  effort?: string;
  status!:
    | "PENDING"
    | "STREAMING"
    | "SUCCEEDED"
    | "FAILED"
    | "CANCELLED"
    | "SKIPPED"
    | "REFUSED";
  skipReason?: string;

  inputTokens!: number;
  outputTokens!: number;
  cacheReadTokens!: number;
  cacheWriteTokens!: number;
  /** DECIMAL — mysql2 returns it as a STRING. Aggregate in SQL. */
  costUsd!: number;

  latencyMs?: number;
  /**
   * Time from the customer's message to this AI answer.
   *
   * DELIBERATELY NOT `supportTicket.responseTime`. That column feeds the desk's
   * Avg Response KPI, which measures HUMAN responsiveness; an AI answering in
   * three seconds would collapse it to near zero on every install and destroy
   * the only human-SLA measure the operator has.
   */
  aiFirstResponseMs?: number;

  retrievalScore?: number;
  retrievedChunkIds?: string[];
  citations?: unknown[];
  citationMode?: "NATIVE" | "MARKER";
  toolCalls?: unknown[];
  groundedness?: number;
  verdict?: "ANSWERED" | "ESCALATED" | "REFUSED";
  escalationReason?: string;

  /** Copilot mode: what the model wrote. */
  draftText?: string;
  /** Copilot mode: what the human actually sent. */
  sentText?: string;
  editDistance?: number;
  wasSent?: boolean;

  promptHash?: string;
  errorCode?: string;
  errorMessage?: string;

  createdAt!: Date;
  updatedAt!: Date;

  public static initModel(sequelize: Sequelize.Sequelize): typeof aiSupportTurn {
    return aiSupportTurn.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        sessionId: { type: DataTypes.UUID, allowNull: false },
        ticketId: { type: DataTypes.UUID, allowNull: false },
        messageKey: { type: DataTypes.STRING(64), allowNull: true },
        trigger: {
          type: DataTypes.ENUM(
            "NEW_TICKET",
            "CUSTOMER_REPLY",
            "MANUAL",
            "RETRY",
            "HANDBACK"
          ),
          allowNull: false,
          defaultValue: "CUSTOMER_REPLY",
        },
        providerId: {
          type: DataTypes.STRING(32),
          allowNull: false,
          defaultValue: "null",
        },
        model: { type: DataTypes.STRING(96), allowNull: true },
        effort: { type: DataTypes.STRING(16), allowNull: true },
        status: {
          type: DataTypes.ENUM(
            "PENDING",
            "STREAMING",
            "SUCCEEDED",
            "FAILED",
            "CANCELLED",
            "SKIPPED",
            "REFUSED"
          ),
          allowNull: false,
          defaultValue: "PENDING",
        },
        skipReason: { type: DataTypes.STRING(96), allowNull: true },

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
        aiFirstResponseMs: { type: DataTypes.INTEGER, allowNull: true },

        retrievalScore: { type: DataTypes.FLOAT, allowNull: true },
        retrievedChunkIds: {
          type: DataTypes.JSON,
         allowNull: true,
          get(this: any) {
            /*
             * Guarded both ways: `typeof` stops an already-parsed value (prod
             * MySQL) being parsed a second time, and the try/catch stops a
             * corrupt value throwing inside a getter during an ordinary read.
             */
            const value = this.getDataValue("retrievedChunkIds") as unknown;
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
        citations: {
          type: DataTypes.JSON,
         allowNull: true,
          get(this: any) {
            /*
             * Guarded both ways: `typeof` stops an already-parsed value (prod
             * MySQL) being parsed a second time, and the try/catch stops a
             * corrupt value throwing inside a getter during an ordinary read.
             */
            const value = this.getDataValue("citations") as unknown;
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
        citationMode: {
          type: DataTypes.ENUM("NATIVE", "MARKER"),
          allowNull: true,
        },
        toolCalls: {
          type: DataTypes.JSON,
         allowNull: true,
          get(this: any) {
            /*
             * Guarded both ways: `typeof` stops an already-parsed value (prod
             * MySQL) being parsed a second time, and the try/catch stops a
             * corrupt value throwing inside a getter during an ordinary read.
             */
            const value = this.getDataValue("toolCalls") as unknown;
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
        groundedness: { type: DataTypes.FLOAT, allowNull: true },
        verdict: {
          type: DataTypes.ENUM("ANSWERED", "ESCALATED", "REFUSED"),
          allowNull: true,
        },
        escalationReason: { type: DataTypes.STRING(96), allowNull: true },

        draftText: { type: DataTypes.TEXT, allowNull: true },
        sentText: { type: DataTypes.TEXT, allowNull: true },
        editDistance: { type: DataTypes.FLOAT, allowNull: true },
        wasSent: { type: DataTypes.BOOLEAN, allowNull: true },

        promptHash: { type: DataTypes.STRING(64), allowNull: true },
        errorCode: { type: DataTypes.STRING(64), allowNull: true },
        errorMessage: { type: DataTypes.TEXT, allowNull: true },
      },
      {
        sequelize,
        modelName: "aiSupportTurn",
        tableName: "ai_support_turn",
        paranoid: false,
        timestamps: true,
        indexes: [
          { name: "PRIMARY", unique: true, fields: [{ name: "id" }] },
          {
            name: "ai_support_turn_session_idx",
            using: "BTREE",
            fields: [{ name: "sessionId" }],
          },
          {
            name: "ai_support_turn_ticket_idx",
            using: "BTREE",
            fields: [{ name: "ticketId" }],
          },
          {
            name: "ai_support_turn_status_created_idx",
            using: "BTREE",
            fields: [{ name: "status" }, { name: "createdAt" }],
          },
          {
            name: "ai_support_turn_verdict_idx",
            using: "BTREE",
            fields: [{ name: "verdict" }],
          },
          {
            /*
             * THE BUDGET SUM, which runs on every model call in the product.
             *
             * `sumCostSince` reads `WHERE createdAt >= ? AND costUsd > 0` from
             * this table and from `ai_support_admin_turn`, twice per
             * `getBudgetStatus()`, and that gate sits in front of every customer
             * answer, every proactive message, triage, summary, every admin
             * console question, the handbook, the ask route, gap drafting, the
             * provider test and the settings screen.
             *
             * A range on `createdAt` cannot use `(status, createdAt)` — that
             * index leads on `status`, so a query naming no status has to scan.
             * There was no index leading on `createdAt` at all, which made the
             * cheapest gate in the chain a pair of full table scans of ninety
             * days of turns, paid before the provider is even called.
             *
             * `costUsd` rides along as the second column so the read is covering:
             * both the filter and the summed value come out of the index without
             * touching a row. The admin half of the same union has carried the
             * identical index since it was created; this is its mirror, and the
             * omission here is only that the customer table predates the union.
             */
            name: "ai_support_turn_cost_idx",
            using: "BTREE",
            fields: [{ name: "createdAt" }, { name: "costUsd" }],
          },
        ],
      }
    );
  }

  public static associate(models: any) {
    aiSupportTurn.belongsTo(models.aiSupportSession, {
      foreignKey: "sessionId",
      as: "session",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    aiSupportTurn.hasMany(models.aiSupportFeedback, {
      foreignKey: "turnId",
      as: "feedback",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  }
}
