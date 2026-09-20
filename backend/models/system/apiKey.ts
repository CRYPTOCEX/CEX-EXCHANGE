import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";
import { ANY_UUID_VERSION } from "@b/utils/model-validators";

export default class apiKey
  extends Model<apiKeyAttributes, apiKeyCreationAttributes>
  implements apiKeyAttributes
{
  id!: string;
  userId?: string;
  name!: string;
  key!: string;
  secret?: string | null;
  secretCreatedAt?: Date | null;
  type!: "user" | "plugin";
  permissions!: string[];
  ipRestriction!: boolean;
  ipWhitelist!: string[];
  lastUsedAt?: Date | null;
  lastUsedIp?: string | null;
  expiresAt?: Date | null;
  disabled?: boolean;
  disabledAt?: Date | null;
  disabledReason?: string | null;
  disabledBy?: "user" | "admin" | null;
  rateLimitOverride?: Record<string, { limit: number; windowSec: number }> | null;
  createdAt?: Date;
  deletedAt?: Date;
  updatedAt?: Date;

  public static initModel(sequelize: Sequelize.Sequelize): typeof apiKey {
    return apiKey.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        userId: {
          type: DataTypes.UUID,
          allowNull: true,
          validate: {
            isUUID: { args: ANY_UUID_VERSION, msg: "userId: Must be a valid UUID" },
          },
        },
        name: {
          type: DataTypes.STRING(255),
          allowNull: false,
          validate: {
            notEmpty: { msg: "name: API key name must not be empty" },
          },
        },
        key: {
          type: DataTypes.STRING(255),
          allowNull: false,
          validate: {
            notEmpty: { msg: "key: API key must not be empty" },
          },
        },
        secret: {
          type: DataTypes.STRING(255),
          allowNull: true,
        },
        secretCreatedAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        type: {
          type: DataTypes.ENUM("user", "plugin"),
          allowNull: false,
          defaultValue: "user",
        },
        permissions: {
          type: DataTypes.JSON,
          allowNull: false,
          defaultValue: [],
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
          get(this: apiKey) {
            const value = this.getDataValue("permissions") as unknown;
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
        ipRestriction: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        ipWhitelist: {
          type: DataTypes.JSON,
          allowNull: false,
          defaultValue: [],
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
          get(this: apiKey) {
            const value = this.getDataValue("ipWhitelist") as unknown;
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
        lastUsedAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        lastUsedIp: {
          type: DataTypes.STRING(64),
          allowNull: true,
        },
        expiresAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        disabled: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        disabledAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        disabledReason: {
          type: DataTypes.STRING(255),
          allowNull: true,
        },
        disabledBy: {
          type: DataTypes.ENUM("user", "admin"),
          allowNull: true,
        },
        rateLimitOverride: {
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
          get(this: apiKey) {
            const value = this.getDataValue("rateLimitOverride") as unknown;
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
        modelName: "apiKey",
        tableName: "api_key",
        timestamps: true,
        paranoid: true,
        // The HMAC signing secret is write-only after creation/rotation: the
        // generic api-key endpoints serialize model instances raw, so without
        // this scope the plaintext secret would leak in every list/update
        // response. Readers that legitimately need it (HMAC verification)
        // must use apiKey.scope("withSecret").
        defaultScope: {
          attributes: { exclude: ["secret"] },
        },
        scopes: {
          withSecret: {},
        },
        indexes: [
          {
            name: "PRIMARY",
            unique: true,
            using: "BTREE",
            fields: [{ name: "id" }],
          },
          {
            name: "apiKeyKeyIdx",
            unique: true,
            using: "BTREE",
            fields: [{ name: "key" }],
          },
          {
            name: "apiKeyUserIdIdx",
            using: "BTREE",
            fields: [{ name: "userId" }],
          },
        ],
      }
    );
  }

  public static associate(models: any) {
    apiKey.belongsTo(models.user, {
      as: "user",
      foreignKey: "userId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    apiKey.hasMany(models.apiKeyAuditLog, {
      as: "auditLogs",
      foreignKey: "apiKeyId",
      onDelete: "CASCADE",
    });
  }
}
