import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

export type ApiKeyAuditAction =
  | "key.created"
  | "key.updated"
  | "key.deleted"
  | "key.rotated"
  | "secret.attached"
  | "secret.rotated"
  | "secret.revoked"
  | "auth.failed"
  | "auth.replay_blocked"
  | "auth.ip_blocked"
  | "auth.expired"
  /**
   * Signature was valid but the caller's clock is outside recvWindow. Its own
   * action rather than a flavour of `auth.failed` because the remedy is
   * completely different — the credentials are correct and only the clock is
   * wrong — and because the customer console reads these action strings to
   * explain why a bot is being turned away. `action` is a STRING column, not an
   * ENUM, so adding a value needs no schema change.
   */
  | "auth.skew_blocked"
  /**
   * Signature and key were both fine, but the key lacks the scope the route
   * requires. Its own action because the remedy is unique — add a permission,
   * not rotate a secret or fix a clock — and because without a row the agent's
   * most likely misconfiguration (using a trading key) is invisible on both
   * sides of the wire.
   */
  | "auth.scope_blocked"
  | "trade.placed"
  | "trade.cancelled"
  | "killswitch.triggered"
  | "auth.disabled_blocked";

export default class apiKeyAuditLog
  extends Model<apiKeyAuditLogAttributes, apiKeyAuditLogCreationAttributes>
  implements apiKeyAuditLogAttributes
{
  id!: string;
  apiKeyId!: string;
  userId?: string | null;
  action!: ApiKeyAuditAction;
  ip?: string | null;
  userAgent?: string | null;
  routePath?: string | null;
  method?: string | null;
  statusCode?: number | null;
  metadata?: Record<string, any> | null;
  createdAt?: Date;
  updatedAt?: Date;

  public static initModel(
    sequelize: Sequelize.Sequelize
  ): typeof apiKeyAuditLog {
    return apiKeyAuditLog.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        apiKeyId: {
          type: DataTypes.UUID,
          allowNull: false,
        },
        userId: {
          type: DataTypes.UUID,
          allowNull: true,
        },
        action: {
          type: DataTypes.STRING(64),
          allowNull: false,
        },
        ip: {
          type: DataTypes.STRING(64),
          allowNull: true,
        },
        userAgent: {
          type: DataTypes.STRING(512),
          allowNull: true,
        },
        routePath: {
          type: DataTypes.STRING(255),
          allowNull: true,
        },
        method: {
          type: DataTypes.STRING(16),
          allowNull: true,
        },
        statusCode: {
          type: DataTypes.INTEGER,
          allowNull: true,
        },
        metadata: {
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
          get(this: apiKeyAuditLog) {
            const value = this.getDataValue("metadata") as unknown;
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
      },
      {
        sequelize,
        modelName: "apiKeyAuditLog",
        tableName: "api_key_audit_log",
        timestamps: true,
        paranoid: false,
        indexes: [
          {
            name: "PRIMARY",
            unique: true,
            using: "BTREE",
            fields: [{ name: "id" }],
          },
          {
            name: "apiKeyAuditLogApiKeyIdIdx",
            using: "BTREE",
            fields: [{ name: "apiKeyId" }],
          },
          {
            name: "apiKeyAuditLogActionIdx",
            using: "BTREE",
            fields: [{ name: "action" }],
          },
          {
            name: "apiKeyAuditLogCreatedAtIdx",
            using: "BTREE",
            fields: [{ name: "createdAt" }],
          },
        ],
      }
    );
  }

  public static associate(models: any) {
    apiKeyAuditLog.belongsTo(models.apiKey, {
      as: "apiKey",
      foreignKey: "apiKeyId",
      onDelete: "CASCADE",
    });
    apiKeyAuditLog.belongsTo(models.user, {
      as: "user",
      foreignKey: "userId",
      onDelete: "SET NULL",
    });
  }
}
