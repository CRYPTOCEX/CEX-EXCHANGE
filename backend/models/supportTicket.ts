import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";
import { logger } from "@b/utils/console";

export interface SupportMessage {
  type: string;
  text: string;
  time: string | Date;
  userId?: string;
  attachments?: string[];
}

export default class supportTicket extends Model<any, any> {
  id!: string;
  userId!: string;
  agentId?: string | null;
  agentName?: string | null;
  subject!: string;
  importance!: "LOW" | "MEDIUM" | "HIGH";
  status!: "PENDING" | "OPEN" | "REPLIED" | "CLOSED";
  messages?: SupportMessage[] | null;
  type?: "LIVE" | "TICKET";
  tags?: string[] | null;
  responseTime?: number | null;
  satisfaction?: number | null;
  /**
   * The last CONVERSATIONAL message in `messages` — who sent it and when.
   *
   * ---------------------------------------------------------------------------
   * DERIVED, AND STORED ANYWAY, BECAUSE `ORDER BY` CANNOT REACH A JSON BLOB
   * ---------------------------------------------------------------------------
   * The support desk queue is ordered by who is waiting and for how long, and
   * both of those are facts about the last message a PERSON sent — not about
   * `updatedAt`, which moves when a ticket is merely assigned or retagged, and
   * not about `status`, which an operator can set by hand.
   *
   * `messages` is a longtext JSON array on MariaDB 10.4, which has no
   * `JSON_TABLE`, so "the last element that is not a system chip" is not
   * expressible in SQL at all. Without these two columns the queue can only be
   * ordered in JavaScript, which means ordering AFTER `LIMIT` — and the rows a
   * recency-based `LIMIT` discards are exactly the longest-waiting ones the
   * queue exists to put on top.
   *
   * SYSTEM CHIPS ARE EXCLUDED. A status change or a handover notice is the
   * interface speaking; it is not somebody waiting for an answer, so it can
   * neither own the last word nor restart the clock.
   *
   * Written by `appendSupportMessage` and `replaceSupportMessage` — the only two
   * functions that ever write `messages` — and backfilled for existing rows by
   * `seeders/20260806000001-support-ticket-last-message.js`.
   */
  lastMessageAt?: Date | null;
  lastMessageFrom?: "client" | "agent" | null;
  createdAt?: Date;
  deletedAt?: Date;
  updatedAt?: Date;

  public static initModel(
    sequelize: Sequelize.Sequelize
  ): typeof supportTicket {
    return supportTicket.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        userId: {
          type: DataTypes.UUID,
          allowNull: false,
          comment: "ID of the user who created this support ticket",
        },
        agentId: {
          type: DataTypes.UUID,
          allowNull: true,
          comment: "ID of the support agent assigned to this ticket",
        },
        agentName: {
          type: DataTypes.STRING(191),
          allowNull: true,
          comment: "Agent display name for faster lookup",
        },
        subject: {
          type: DataTypes.STRING(191),
          allowNull: false,
          comment: "Subject/title of the support ticket",
        },
        importance: {
          type: DataTypes.ENUM("LOW", "MEDIUM", "HIGH"),
          allowNull: false,
          defaultValue: "LOW",
          comment: "Priority level of the support ticket",
        },
        messages: {
          type: DataTypes.JSON,
          allowNull: true,
          get() {
            const value = this.getDataValue("messages");
            if (!value) return [];
            
            // If it's already an array, return it
            if (Array.isArray(value)) return value;
            
            // If it's a string, try to parse it
            if (typeof value === 'string') {
              try {
                const parsed = JSON.parse(value);
                return Array.isArray(parsed) ? parsed : [];
              } catch (e) {
                logger.error("TICKET", `Failed to parse messages JSON for ticket ${this.id}`, e);
                return [];
              }
            }
            
            return [];
          },
          set(val) {
            try {
              if (
                Array.isArray(val) &&
                val.every(
                  (item) =>
                    typeof item === "object" &&
                    typeof item.type === "string" &&
                    typeof item.text === "string" &&
                    item.time
                )
              ) {
                this.setDataValue("messages", val);
              } else if (val === null || val === undefined) {
                this.setDataValue("messages", val);
              } else {
                logger.error("TICKET", `Invalid messages format for ticket ${this.id}`);
                throw new Error(
                  "messages must be an array of message objects or null/undefined"
                );
              }
            } catch (error) {
              logger.error("TICKET", `Error setting messages for ticket ${this.id}`, error);
              throw error;
            }
          },
          comment: "Array of chat messages between user and support agent",
        },
        status: {
          type: DataTypes.ENUM("PENDING", "OPEN", "REPLIED", "CLOSED"),
          allowNull: false,
          defaultValue: "PENDING",
          comment: "Current status of the support ticket",
        },
        type: {
          type: DataTypes.ENUM("LIVE", "TICKET"),
          allowNull: false,
          defaultValue: "TICKET",
          comment: "Type of support - live chat or ticket system",
        },
        tags: {
          type: DataTypes.JSON,
          allowNull: true,
          comment: "Tags for search/filter (string array)",
          get() {
            const value = this.getDataValue("tags");
            if (!value) return [];
            
            // If it's already an array, return it
            if (Array.isArray(value)) return value;
            
            // If it's a string, try to parse it
            if (typeof value === 'string') {
              try {
                const parsed = JSON.parse(value);
                return Array.isArray(parsed) ? parsed : [];
              } catch (e) {
                logger.error("TICKET", `Failed to parse tags JSON for ticket ${this.id}`, e);
                return [];
              }
            }
            
            return [];
          },
          set(val) {
            try {
              if (
                Array.isArray(val) &&
                val.every((item) => typeof item === "string")
              ) {
                this.setDataValue("tags", val);
              } else if (val === null || val === undefined) {
                this.setDataValue("tags", val);
              } else {
                logger.error("TICKET", `Invalid tags format for ticket ${this.id}`);
                throw new Error(
                  "tags must be an array of strings or null/undefined"
                );
              }
            } catch (error) {
              logger.error("TICKET", `Error setting tags for ticket ${this.id}`, error);
              throw error;
            }
          },
        },
        responseTime: {
          type: DataTypes.INTEGER,
          allowNull: true,
          comment: "Minutes from creation to first agent reply",
        },
        satisfaction: {
          type: DataTypes.FLOAT,
          allowNull: true,
          comment: "Rating 1-5 from user",
        },
        lastMessageAt: {
          /*
           * DATETIME(3), not DATETIME. Message `time` is an ISO string carrying
           * milliseconds, and a plain DATETIME truncates to the second — which
           * collapses messages 15ms apart into a tie and lets the queue order
           * two tickets differently from the thread they came from. The
           * tie-break is `id` and therefore stable across pages either way, but
           * "stable" and "right" are different claims and the column may as well
           * make both.
           */
          type: DataTypes.DATE(3),
          allowNull: true,
          comment:
            "Time of the last non-system message. Derived from messages; the queue's sort key",
        },
        lastMessageFrom: {
          /*
           * STRING, not ENUM. `messages[].type` is typed `string` on this model
           * and has only ever held "client" or "agent", but an ENUM turns any
           * third value a future writer invents into a rejected UPDATE — which
           * would fail the customer's own message rather than the bookkeeping
           * beside it. A VARCHAR degrades to "not client", which sorts the
           * ticket as answered rather than dropping it.
           */
          type: DataTypes.STRING(8),
          allowNull: true,
          comment:
            "Sender of the last non-system message: client or agent. Null when the thread has none",
        },
        createdAt: DataTypes.DATE,
        updatedAt: DataTypes.DATE,
        deletedAt: DataTypes.DATE,
      },
      {
        sequelize,
        modelName: "supportTicket",
        tableName: "support_ticket",
        timestamps: true,
        paranoid: true,
        indexes: [
          {
            name: "PRIMARY",
            unique: true,
            using: "BTREE",
            fields: [{ name: "id" }],
          },
          { name: "agentId", using: "BTREE", fields: [{ name: "agentId" }] },
          {
            name: "supportTicketUserIdForeign",
            using: "BTREE",
            fields: [{ name: "userId" }],
          },
          { name: "tags_idx", using: "BTREE", fields: [{ name: "tags", length: 255 }] },
          /*
           * The desk queue's ORDER BY, in order. `status` bands first (the
           * queue splits waiting-on-us / waiting-on-them / closed), then the
           * wait itself — so this index serves the default view's sort and its
           * `status <> 'CLOSED'` filter from one read.
           */
          {
            name: "support_ticket_queue_idx",
            using: "BTREE",
            fields: [{ name: "status" }, { name: "lastMessageAt" }],
          },
        ],
      }
    );
  }

  public static associate(models: any) {
    supportTicket.belongsTo(models.user, {
      as: "user",
      foreignKey: "userId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    supportTicket.belongsTo(models.user, {
      as: "agent",
      foreignKey: "agentId",
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    });
  }
}
