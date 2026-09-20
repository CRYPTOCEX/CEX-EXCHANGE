import { DataTypes, Model, Sequelize } from "sequelize";

/**
 * COLD STORE FOR `wallet_audit_log` ROWS OLDER THAN THE RETENTION CUTOFF.
 *
 * The audit companion of transactionArchive.ts, and the same argument applies
 * (plans/done/ORDER-SCALE-10K.md WP-4.4): the live table gains one row per wallet
 * mutation and carries four indexes, one of them UNIQUE on a random string
 * key, so its growth is bounded only by a job that moves old rows out. The
 * job (src/cron/ledger-archive.ts) copies with `INSERT IGNORE ... SELECT` over
 * an identical column list and hard-deletes the copied rows; an audit row
 * whose transaction is still in flight (PENDING on the live `transaction`
 * table) is never moved, so the live audit trail of an open operation stays
 * whole.
 *
 * SAME COLUMNS, SAME TYPES as walletAuditLog.ts, including the JSON metadata
 * column with the guarded getter (prod MySQL hands JSON back parsed, local
 * MariaDB stores LONGTEXT and hands back a string; an archived row read
 * through the model must behave exactly like the live one did). The unit
 * suite initialises both models and fails on any attribute drift.
 *
 * Different on purpose: two indexes (PRIMARY, createdAt) instead of four, no
 * UNIQUE on idempotencyKey (cold storage is written in bulk and never
 * deduplicated by key), and no association at all.
 */
export default class walletAuditLogArchive
  extends Model<walletAuditLogArchiveAttributes, walletAuditLogArchiveCreationAttributes>
  implements walletAuditLogArchiveAttributes
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

  public static initModel(sequelize: Sequelize): typeof walletAuditLogArchive {
    return walletAuditLogArchive.init(
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
          // The live model's guard, verbatim: see walletAuditLog.ts for why an
          // unguarded JSON.parse works locally and 500s on prod.
          get(this: walletAuditLogArchive) {
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
        modelName: "walletAuditLogArchive",
        tableName: "wallet_audit_log_archive",
        timestamps: false,
        paranoid: false,
        indexes: [
          {
            name: "PRIMARY",
            unique: true,
            using: "BTREE",
            fields: [{ name: "id" }],
          },
          {
            name: "idx_wallet_audit_log_archive_createdAt",
            using: "BTREE",
            fields: [{ name: "createdAt" }],
          },
        ],
      }
    );
  }

  public static associate(_models: any) {
    // None, on purpose: cold storage carries no foreign keys.
  }
}
