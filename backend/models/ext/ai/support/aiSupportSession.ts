import type * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

/**
 * Handover state for one conversation. Exactly one row per support ticket.
 *
 * The state lives HERE and not in `supportTicket.status`. That column is a
 * repaired whose-turn axis (PENDING / OPEN / REPLIED / CLOSED) consumed by
 * `supportQueueScope()`, `stat.get.ts`, `operations/summary.get.ts` and
 * `lib/status-tone.ts`; adding a fifth value drops tickets out of the admin
 * queue and freezes their SLA clock. A side table also means uninstalling this
 * addon leaves core support byte-identical.
 */
export default class aiSupportSession
  extends Model<aiSupportSessionAttributes, aiSupportSessionCreationAttributes>
  implements aiSupportSessionAttributes
{
  id!: string;
  ticketId!: string;
  agentId?: string;
  state!:
    | "AI_ACTIVE"
    | "AWAITING_USER"
    | "HUMAN_REQUESTED"
    | "HUMAN_ACTIVE"
    | "AI_SUSPENDED"
    | "RESOLVED";
  previousState?: string;
  /**
   * Non-null while a generation is in flight. The conditional UPDATE that sets
   * it is the barge-in fence: zero rows affected means a human owns the
   * conversation, or another generation is already running, so this turn is
   * recorded SKIPPED and nothing is appended.
   */
  generationToken?: string;
  activeTurnId?: string;
  humanAgentId?: string;
  turnCount!: number;
  escalationReason?: string;
  locale?: string;
  /**
   * Three-line brief written when the conversation is handed to a human.
   *
   * Written ONCE at escalation, not per view: the human opening the Live Inbox
   * needs it immediately, and generating on read would put a model call on the
   * render path of every click through the queue. Null on sessions the AI never
   * escalated.
   */
  handoverSummary?: string;
  lastStateAt?: Date;
  deflected?: boolean;
  /**
   * Running conversation cost. DECIMAL — and mysql2 returns every DECIMAL as a
   * STRING, so aggregate this in SQL (`SUM(costUsdTotal)`), never with a JS
   * reduce, which would concatenate.
   */
  costUsdTotal!: number;
  channel!: "TICKET" | "LIVE";

  createdAt!: Date;
  updatedAt!: Date;

  public static initModel(
    sequelize: Sequelize.Sequelize
  ): typeof aiSupportSession {
    return aiSupportSession.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        ticketId: {
          type: DataTypes.UUID,
          allowNull: false,
          unique: true,
        },
        agentId: {
          type: DataTypes.UUID,
          allowNull: true,
        },
        state: {
          type: DataTypes.ENUM(
            "AI_ACTIVE",
            "AWAITING_USER",
            "HUMAN_REQUESTED",
            "HUMAN_ACTIVE",
            "AI_SUSPENDED",
            "RESOLVED"
          ),
          allowNull: false,
          defaultValue: "AI_ACTIVE",
        },
        previousState: {
          type: DataTypes.STRING(32),
          allowNull: true,
        },
        generationToken: {
          type: DataTypes.STRING(64),
          allowNull: true,
        },
        activeTurnId: {
          type: DataTypes.UUID,
          allowNull: true,
        },
        humanAgentId: {
          type: DataTypes.UUID,
          allowNull: true,
        },
        turnCount: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        escalationReason: {
          type: DataTypes.STRING(96),
          allowNull: true,
        },
        locale: {
          type: DataTypes.STRING(16),
          allowNull: true,
        },
        handoverSummary: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        lastStateAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        deflected: {
          type: DataTypes.BOOLEAN,
          allowNull: true,
        },
        costUsdTotal: {
          type: DataTypes.DECIMAL(12, 6),
          allowNull: false,
          defaultValue: 0,
        },
        channel: {
          type: DataTypes.ENUM("TICKET", "LIVE"),
          allowNull: false,
          defaultValue: "TICKET",
        },
      },
      {
        sequelize,
        modelName: "aiSupportSession",
        tableName: "ai_support_session",
        paranoid: false,
        timestamps: true,
        indexes: [
          { name: "PRIMARY", unique: true, fields: [{ name: "id" }] },
          {
            name: "ai_support_session_ticket_uq",
            unique: true,
            using: "BTREE",
            fields: [{ name: "ticketId" }],
          },
          {
            name: "ai_support_session_state_idx",
            using: "BTREE",
            fields: [{ name: "state" }],
          },
          {
            name: "ai_support_session_agent_idx",
            using: "BTREE",
            fields: [{ name: "agentId" }],
          },
        ],
      }
    );
  }

  public static associate(models: any) {
    aiSupportSession.belongsTo(models.supportTicket, {
      foreignKey: "ticketId",
      as: "ticket",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    aiSupportSession.belongsTo(models.aiSupportAgent, {
      foreignKey: "agentId",
      as: "agent",
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    });
    aiSupportSession.hasMany(models.aiSupportTurn, {
      foreignKey: "sessionId",
      as: "turns",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    aiSupportSession.hasMany(models.aiSupportHandover, {
      foreignKey: "sessionId",
      as: "handovers",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  }
}
