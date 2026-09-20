import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

/**
 * Append-only log of meaningful per-user account events.
 * Surfaces in the "Recent Activity" card on the user dashboard and is
 * intended as the foundation for an audit trail (sign-ins, 2FA changes,
 * API key lifecycle, KYC submissions, etc).
 *
 * Severity is for UI styling only. Don't gate logic on it.
 */
export type UserActivityType =
  | "auth.login"
  | "auth.login_failed"
  | "auth.logout"
  | "security.2fa_enabled"
  | "security.2fa_disabled"
  | "security.password_reset"
  | "security.password_changed"
  | "security.email_verified"
  | "security.phone_verified"
  | "security.session_revoked"
  | "security.withdraw_2fa_verified"
  | "security.p2p_2fa_verified"
  | "security.transfer_verified"
  | "security.transfer_pin_changed"
  | "security.transfer_pin_cleared"
  | "security.transfer_pin_locked"
  | "security.transfer_pin_unlocked"
  | "api_key.created"
  | "api_key.updated"
  | "api_key.deleted"
  | "kyc.submitted"
  | "kyc.updated"
  | "kyc.approved"
  | "kyc.rejected"
  | "profile.updated"
  | "wallet.connected"
  | "wallet.disconnected";

export type UserActivitySeverity = "success" | "warning" | "info";

export default class userActivity
  extends Model<userActivityAttributes, userActivityCreationAttributes>
  implements userActivityAttributes
{
  id!: string;
  userId!: string;
  type!: UserActivityType;
  title!: string;
  description?: string | null;
  severity!: UserActivitySeverity;
  ip?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, any> | null;
  createdAt?: Date;
  updatedAt?: Date;

  public static initModel(
    sequelize: Sequelize.Sequelize
  ): typeof userActivity {
    return userActivity.init(
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
        },
        type: {
          type: DataTypes.STRING(64),
          allowNull: false,
        },
        title: {
          type: DataTypes.STRING(191),
          allowNull: false,
        },
        description: {
          type: DataTypes.STRING(512),
          allowNull: true,
        },
        severity: {
          type: DataTypes.ENUM("success", "warning", "info"),
          allowNull: false,
          defaultValue: "info",
        },
        ip: {
          type: DataTypes.STRING(64),
          allowNull: true,
        },
        userAgent: {
          type: DataTypes.STRING(512),
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
          get(this: userActivity) {
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
        modelName: "userActivity",
        tableName: "user_activity",
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
            name: "userActivityUserIdCreatedAtIdx",
            using: "BTREE",
            fields: [{ name: "userId" }, { name: "createdAt" }],
          },
          {
            name: "userActivityTypeIdx",
            using: "BTREE",
            fields: [{ name: "type" }],
          },
        ],
      }
    );
  }

  public static associate(models: any) {
    userActivity.belongsTo(models.user, {
      as: "user",
      foreignKey: "userId",
      onDelete: "CASCADE",
    });
  }
}
