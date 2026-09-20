import type * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

/**
 * An AI support persona: who the agent is, which model it runs on, what it is
 * allowed to do, and how autonomous it is.
 *
 * There is deliberately NO `temperature` column. `temperature`, `top_p` and
 * `top_k` are rejected with a 400 by Opus 5 and Sonnet 5; tone is steered by the
 * persona text, not by sampling parameters.
 */
export default class aiSupportAgent
  extends Model<aiSupportAgentAttributes, aiSupportAgentCreationAttributes>
  implements aiSupportAgentAttributes
{
  id!: string;
  name!: string;
  slug!: string;
  avatar?: string;
  persona!: string;
  disclosureText?: string;
  model?: string;
  effort?: "low" | "medium" | "high" | "xhigh" | "max";
  maxTokens!: number;
  /**
   * COPILOT     drafts only; a human presses Send. The shipped default.
   * AUTO_TICKET answers tickets by itself; live chat still drafts.
   * AUTO_ALL    answers tickets and live chat by itself.
   */
  autonomy!: "COPILOT" | "AUTO_TICKET" | "AUTO_ALL";
  toolsEnabled?: string[];
  channels?: string[];
  languages?: string[];
  /**
   * NOT the source of office hours. Written by the agent admin routes, read by
   * nothing.
   *
   * When the desk is staffed lives in the SETTINGS keys
   * (`aiSupportOfficeHours*`), resolved by `utils/office-hours.ts`. The reason
   * is this row's optionality: a real install can have zero persona rows —
   * which is exactly how `persona: null` shipped to every customer — so hours
   * stored here would be absent on most installs while looking configured in
   * the code.
   *
   * Left in place rather than dropped because removing a column is a migration
   * on a table an operator may have populated. Do not wire it up: two sources
   * for the same fact is the split-brain this comment exists to prevent.
   */
  workingHours?: Record<string, unknown>;
  timezone?: string;
  status!: boolean;

  createdAt!: Date;
  updatedAt!: Date;
  deletedAt?: Date;

  public static initModel(
    sequelize: Sequelize.Sequelize
  ): typeof aiSupportAgent {
    return aiSupportAgent.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        name: {
          type: DataTypes.STRING(96),
          allowNull: false,
          validate: { notEmpty: { msg: "name: Agent name must not be empty" } },
        },
        slug: {
          type: DataTypes.STRING(96),
          allowNull: false,
          unique: true,
        },
        avatar: {
          type: DataTypes.STRING(255),
          allowNull: true,
        },
        persona: {
          type: DataTypes.TEXT,
          allowNull: false,
          defaultValue: "",
        },
        disclosureText: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        model: {
          type: DataTypes.STRING(96),
          allowNull: true,
        },
        effort: {
          type: DataTypes.ENUM("low", "medium", "high", "xhigh", "max"),
          allowNull: true,
        },
        maxTokens: {
          type: DataTypes.INTEGER,
          allowNull: false,
          // Floor of 4000: extended thinking tokens count against maxTokens, so
          // a lower ceiling can consume the whole budget thinking and return an
          // empty answer.
          defaultValue: 4000,
          validate: { min: 1024, max: 64000 },
        },
        autonomy: {
          type: DataTypes.ENUM("COPILOT", "AUTO_TICKET", "AUTO_ALL"),
          allowNull: false,
          defaultValue: "COPILOT",
        },
        toolsEnabled: {
          type: DataTypes.JSON,
          allowNull: true,
          /*
           * Guarded getter. Prod MySQL delivers a DataTypes.JSON column ALREADY
           * PARSED; local MariaDB stores it as LONGTEXT and hands back the raw
           * STRING, so without this the same endpoint serves an object to one
           * install and a JSON string to another. `Array.isArray("[...]")` is
           * false and `(x || []).map` throws, so the consumer either dies or —
           * worse — silently renders nothing. The `typeof` guard is
           * load-bearing: an unguarded JSON.parse works locally and 500s on
           * prod with `"[object Object]" is not valid JSON`.
           */
          get(this: aiSupportAgent) {
            const value = this.getDataValue("toolsEnabled") as unknown;
            if (value == null) return null;
            if (typeof value === "string") {
              try {
                return JSON.parse(value);
              } catch {
                return null;
              }
            }
            return value;
          },
        },
        channels: {
          type: DataTypes.JSON,
          allowNull: true,
          /*
           * Guarded getter. Prod MySQL delivers a DataTypes.JSON column ALREADY
           * PARSED; local MariaDB stores it as LONGTEXT and hands back the raw
           * STRING, so without this the same endpoint serves an object to one
           * install and a JSON string to another. `Array.isArray("[...]")` is
           * false and `(x || []).map` throws, so the consumer either dies or —
           * worse — silently renders nothing. The `typeof` guard is
           * load-bearing: an unguarded JSON.parse works locally and 500s on
           * prod with `"[object Object]" is not valid JSON`.
           */
          get(this: aiSupportAgent) {
            const value = this.getDataValue("channels") as unknown;
            if (value == null) return null;
            if (typeof value === "string") {
              try {
                return JSON.parse(value);
              } catch {
                return null;
              }
            }
            return value;
          },
        },
        languages: {
          type: DataTypes.JSON,
          allowNull: true,
          /*
           * Guarded getter. Prod MySQL delivers a DataTypes.JSON column ALREADY
           * PARSED; local MariaDB stores it as LONGTEXT and hands back the raw
           * STRING, so without this the same endpoint serves an object to one
           * install and a JSON string to another. `Array.isArray("[...]")` is
           * false and `(x || []).map` throws, so the consumer either dies or —
           * worse — silently renders nothing. The `typeof` guard is
           * load-bearing: an unguarded JSON.parse works locally and 500s on
           * prod with `"[object Object]" is not valid JSON`.
           */
          get(this: aiSupportAgent) {
            const value = this.getDataValue("languages") as unknown;
            if (value == null) return null;
            if (typeof value === "string") {
              try {
                return JSON.parse(value);
              } catch {
                return null;
              }
            }
            return value;
          },
        },
        workingHours: {
          type: DataTypes.JSON,
          allowNull: true,
          /*
           * Guarded getter. Prod MySQL delivers a DataTypes.JSON column ALREADY
           * PARSED; local MariaDB stores it as LONGTEXT and hands back the raw
           * STRING, so without this the same endpoint serves an object to one
           * install and a JSON string to another. `Array.isArray("[...]")` is
           * false and `(x || []).map` throws, so the consumer either dies or —
           * worse — silently renders nothing. The `typeof` guard is
           * load-bearing: an unguarded JSON.parse works locally and 500s on
           * prod with `"[object Object]" is not valid JSON`.
           */
          get(this: aiSupportAgent) {
            const value = this.getDataValue("workingHours") as unknown;
            if (value == null) return null;
            if (typeof value === "string") {
              try {
                return JSON.parse(value);
              } catch {
                return null;
              }
            }
            return value;
          },
        },
        timezone: {
          type: DataTypes.STRING(64),
          allowNull: true,
          defaultValue: "UTC",
        },
        status: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
      },
      {
        sequelize,
        modelName: "aiSupportAgent",
        tableName: "ai_support_agent",
        paranoid: true,
        timestamps: true,
        indexes: [
          { name: "PRIMARY", unique: true, fields: [{ name: "id" }] },
          {
            name: "ai_support_agent_slug_uq",
            unique: true,
            using: "BTREE",
            fields: [{ name: "slug" }],
          },
          {
            name: "ai_support_agent_status_idx",
            using: "BTREE",
            fields: [{ name: "status" }],
          },
        ],
      }
    );
  }

  public static associate(models: any) {
    aiSupportAgent.hasMany(models.aiSupportSession, {
      foreignKey: "agentId",
      as: "sessions",
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    });
  }
}
