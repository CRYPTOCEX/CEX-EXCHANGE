import { DataTypes, Model, Sequelize } from "sequelize";

/**
 * WHO DID WHAT, IN THE ADMIN PANEL.
 *
 * Every admin route already declared `logModule` / `logTitle` in its metadata —
 * "Approve Withdrawal", "Update KYC application", "Database restore", "Block
 * user". `handler/Routes.ts` fed that to `withLogger`, which pushed the steps
 * into an in-memory array and a terminal task handle and wrote them to THE
 * CONSOLE. Nothing was persisted, so the product could not answer "who approved
 * this $40,000 withdrawal", "who rejected this KYC", or "who restored the
 * database" — and the one action that WAS attributed (a user block) only was
 * because `block.post.ts` happens to persist `adminId` on its own row.
 *
 * This table is where that metadata lands now. See the writer in
 * `handler/Routes.ts` for exactly which requests are recorded and why.
 *
 * IT IS APPEND-ONLY, and deliberately shaped like `walletAuditLog`:
 *   - `timestamps: false` with a manual `createdAt` — there is no such thing as
 *     updating an audit row, so there is no `updatedAt` to mislead anyone.
 *   - `paranoid: false` — a soft-deletable audit trail is not an audit trail.
 *   - NO foreign key on `userId`. An FK here would (a) let deleting an admin
 *     cascade away the evidence of what they did, and (b) make the audit INSERT
 *     take a shared lock on a `user` row that the in-flight request may already
 *     hold — the same cross-connection deadlock documented at length on
 *     `walletAuditLog.associate`. The association is kept for eager-loading with
 *     `constraints: false`.
 */
export default class adminAuditLog
  extends Model<adminAuditLogAttributes, adminAuditLogCreationAttributes>
  implements adminAuditLogAttributes
{
  id!: string;
  userId?: string | null;
  module!: string;
  title!: string;
  method!: string;
  path!: string;
  targetId?: string | null;
  targetIds?: string[] | null;
  status!: "SUCCESS" | "ERROR";
  reason?: string | null;
  error?: string | null;
  durationMs?: number | null;
  requestId?: string | null;
  ip?: string | null;
  steps?: Record<string, any> | null;
  createdAt?: Date;

  public static initModel(sequelize: Sequelize): typeof adminAuditLog {
    return adminAuditLog.init(
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
          comment:
            "The admin who performed the action. Nullable: a few logged routes run unauthenticated (installer, cron-triggered maintenance), and losing the row entirely would be worse than recording an unattributed one.",
        },
        module: {
          type: DataTypes.STRING(64),
          allowNull: false,
          comment: "The route's logModule, e.g. ADMIN_FIN, ADMIN_CRM, ADMIN_SYS",
        },
        title: {
          type: DataTypes.STRING(191),
          allowNull: false,
          comment: "The route's logTitle, e.g. 'Approve Withdrawal'",
        },
        method: {
          type: DataTypes.STRING(10),
          allowNull: false,
        },
        path: {
          type: DataTypes.STRING(255),
          allowNull: false,
          comment: "Request path with the query string stripped",
        },
        targetId: {
          type: DataTypes.STRING(64),
          allowNull: true,
          comment:
            "The record the action was aimed at, lifted from the path's last id-shaped segment. Denormalised on purpose: it is what makes 'show me everything that touched this withdrawal' a single indexed lookup.",
        },
        targetIds: {
          type: DataTypes.JSON,
          allowNull: true,
          comment:
            "Every id a BULK route was aimed at. `targetId` holds the first of them so the indexed per-record lookup still resolves; this holds the whole list, because 'approved 40 withdrawals' has to be able to say which forty.",
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
          get(this: adminAuditLog) {
            const value = this.getDataValue("targetIds") as unknown;
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
        status: {
          type: DataTypes.ENUM("SUCCESS", "ERROR"),
          allowNull: false,
        },
        reason: {
          type: DataTypes.TEXT,
          allowNull: true,
          comment:
            "Operator-supplied justification, taken from a `reason` query param or body field. This is the slot the DataTable destructive-action dialog already fills.",
        },
        error: {
          type: DataTypes.TEXT,
          allowNull: true,
          comment: "Failure message when status is ERROR",
        },
        durationMs: {
          type: DataTypes.INTEGER,
          allowNull: true,
        },
        requestId: {
          type: DataTypes.STRING(64),
          allowNull: true,
          comment: "Ties the row back to the console trace for the same request",
        },
        ip: {
          type: DataTypes.STRING(45),
          allowNull: true,
          comment: "IPv6-length; where the action came from",
        },
        steps: {
          type: DataTypes.JSON,
          allowNull: true,
          comment:
            "The ctx.step() trail the handler emitted — the narrative of what the operation actually did.",
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
          get(this: adminAuditLog) {
            const value = this.getDataValue("steps") as unknown;
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
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
      },
      {
        sequelize,
        modelName: "adminAuditLog",
        tableName: "admin_audit_log",
        timestamps: false,
        paranoid: false,
        indexes: [
          {
            name: "idx_admin_audit_log_createdAt",
            using: "BTREE",
            fields: [{ name: "createdAt" }],
          },
          {
            name: "idx_admin_audit_log_userId_createdAt",
            using: "BTREE",
            fields: [{ name: "userId" }, { name: "createdAt" }],
          },
          {
            name: "idx_admin_audit_log_targetId",
            using: "BTREE",
            fields: [{ name: "targetId" }],
          },
          {
            name: "idx_admin_audit_log_module",
            using: "BTREE",
            fields: [{ name: "module" }],
          },
        ],
      }
    );
  }

  public static associate(models: any) {
    // `constraints: false` — see the class docblock. The trail must outlive the
    // account that created it.
    adminAuditLog.belongsTo(models.user, {
      as: "user",
      foreignKey: "userId",
      constraints: false,
    });
  }
}
