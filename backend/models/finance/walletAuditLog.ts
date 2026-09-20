import { DataTypes, Model, Sequelize } from "sequelize";

export default class walletAuditLog
  extends Model<walletAuditLogAttributes, walletAuditLogCreationAttributes>
  implements walletAuditLogAttributes
{
  id!: string;
  userId!: string;
  walletId!: string;
  operation!:
    | "WALLET_CREATED"
    | "CREDIT"
    | "DEBIT"
    | "HOLD"
    | "RELEASE"
    | "TRANSFER_OUT"
    | "TRANSFER_IN"
    | "EXECUTE_FROM_HOLD";
  amount!: number;
  previousBalance?: number;
  newBalance?: number;
  previousInOrder?: number;
  newInOrder?: number;
  transactionId?: string | null;
  idempotencyKey!: string;
  metadata?: Record<string, any>;
  createdAt?: Date;

  public static initModel(sequelize: Sequelize): typeof walletAuditLog {
    return walletAuditLog.init(
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
          comment: "User ID performing the operation",
        },
        walletId: {
          type: DataTypes.UUID,
          allowNull: false,
          comment: "Wallet ID affected by the operation",
        },
        operation: {
          type: DataTypes.ENUM(
            "WALLET_CREATED",
            "CREDIT",
            "DEBIT",
            "HOLD",
            "RELEASE",
            "TRANSFER_OUT",
            "TRANSFER_IN",
            "EXECUTE_FROM_HOLD"
          ),
          allowNull: false,
          comment: "Type of wallet operation",
        },
        // M-038 (`0203_m038_widen_audit`) widens the five money columns from
        // DECIMAL(30,18) to DECIMAL(36,18), matching `wallet.balance` and
        // `transaction.amount`. Two integer digits narrower meant an amount at
        // or above 1e12 could not be audited at all, and the audit row is
        // mandatory — a write whose audit cannot be written must not happen.
        //
        // The model has to carry the WIDER type, not the narrower one: the
        // alter-sync's `changeColumn` writes whatever the model declares, so a
        // (30,18) mirror against a (36,18) column is not a mirror at all, it is
        // a narrowing that truncates every value the widening was for.
        amount: {
          type: DataTypes.DECIMAL(36, 18),
          allowNull: false,
          comment: "Amount involved in the operation",
        },
        previousBalance: {
          type: DataTypes.DECIMAL(36, 18),
          allowNull: true,
          comment: "Balance before the operation",
        },
        newBalance: {
          type: DataTypes.DECIMAL(36, 18),
          allowNull: true,
          comment: "Balance after the operation",
        },
        previousInOrder: {
          type: DataTypes.DECIMAL(36, 18),
          allowNull: true,
          comment: "In-order amount before the operation (for HOLD/RELEASE)",
        },
        newInOrder: {
          type: DataTypes.DECIMAL(36, 18),
          allowNull: true,
          comment: "In-order amount after the operation (for HOLD/RELEASE)",
        },
        transactionId: {
          type: DataTypes.UUID,
          allowNull: true,
          comment:
            "Optional reference to a transaction record. Intentionally NOT a foreign key: this is an immutable, append-only audit log that must accept events with no transaction yet (e.g. WALLET_CREATED) and must never fail or cascade on a missing/deleted transaction.",
        },
        idempotencyKey: {
          type: DataTypes.STRING(255),
          allowNull: false,
          comment: "Idempotency key for deduplication",
        },
        metadata: {
          type: DataTypes.JSON,
          allowNull: true,
          comment:
            "Additional operation metadata (operationType, fee, referenceId, etc.)",
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
          get(this: walletAuditLog) {
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
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
          comment: "Timestamp of the audit entry",
        },
      },
      {
        sequelize,
        modelName: "walletAuditLog",
        tableName: "wallet_audit_log",
        // Immutable, append-only: manual createdAt only, no updatedAt.
        timestamps: false,
        paranoid: false,
        indexes: [
          {
            name: "idx_wallet_audit_log_userId_createdAt",
            using: "BTREE",
            fields: [{ name: "userId" }, { name: "createdAt" }],
          },
          {
            name: "idx_wallet_audit_log_walletId_createdAt",
            using: "BTREE",
            fields: [{ name: "walletId" }, { name: "createdAt" }],
          },
          {
            name: "idx_wallet_audit_log_transactionId",
            using: "BTREE",
            fields: [{ name: "transactionId" }],
          },
          {
            name: "idx_wallet_audit_log_idempotencyKey",
            unique: true,
            using: "BTREE",
            fields: [{ name: "idempotencyKey" }],
          },
        ],
      }
    );
  }

  public static associate(models: any) {
    walletAuditLog.belongsTo(models.wallet, {
      as: "wallet",
      foreignKey: "walletId",
      // constraints:false => keep the association for eager-loading queries but
      // do NOT create/enforce a DB-level foreign key. The audit log is written
      // BEST-EFFORT on a SEPARATE connection from the in-flight wallet
      // transaction (see services/wallet/audit/AuditLogger.ts). With an enforced
      // FK, the audit INSERT takes a shared lock on the parent `wallet` row that
      // the wallet transaction already holds an EXCLUSIVE lock on; the insert
      // then blocks on that lock while the wallet transaction blocks awaiting the
      // insert — a cross-connection self-deadlock that only clears at
      // innodb_lock_wait_timeout (~50s), so EVERY wallet operation (order
      // placement, cancel, fill) stalled for ~50s. Without the constraint the
      // decoupled audit insert simply appends. (CASCADE is also dropped: an audit
      // trail should survive even if its wallet row is ever deleted.)
      constraints: false,
    });
    // NOTE: transactionId is intentionally NOT associated as a foreign key.
    // This is an immutable, append-only audit log: it must accept events that
    // have no transaction yet (e.g. WALLET_CREATED) and must never fail to write
    // or cascade-delete because of a missing/deleted transaction row.
  }
}
